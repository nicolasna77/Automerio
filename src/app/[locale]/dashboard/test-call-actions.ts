"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { assertCanReadClientService } from "@/lib/client-service-access";
import { TELEPHONY_SERVICE_SLUGS } from "@/lib/catalog";
import {
  DEMO_TIME_LIMIT_SEC,
  TEST_CALLS_PER_DAY,
  TEST_SIP_HEADER,
  buildDemoTwiml,
  formatFrenchPhone,
  isDemoCallAvailable,
  isDemoCallDryRun,
  normalizeFrenchPhone,
} from "@/lib/demo-call";
import { ActionError, actionError, runAction } from "@/lib/run-action";
import { placeDemoCall } from "@/lib/twilio";

const TESTABLE_STATUSES = new Set(["CONFIGURING", "ACTIVE"]);

export async function requestTestCallAction(clientServiceId: string, phone: string) {
  return runAction(async () => {
    const session = await requireUser();
    if (!(await assertCanReadClientService(clientServiceId, session.user.id))) {
      throw actionError("notYourService");
    }

    const clientService = await db.clientService.findUnique({
      where: { id: clientServiceId },
      select: { status: true, service: { select: { slug: true } } },
    });
    if (!clientService || !TELEPHONY_SERVICE_SLUGS.has(clientService.service.slug)) {
      throw actionError("phoneOnlyTest");
    }
    if (!TESTABLE_STATUSES.has(clientService.status)) {
      throw actionError("testAfterPayment");
    }

    const to = normalizeFrenchPhone(phone);
    if (!to) {
      throw actionError("frenchNumberRequired");
    }
    if (!isDemoCallAvailable()) {
      throw actionError("testUnavailable");
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { testCall, recent } = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${clientServiceId}))`;
      const recent = await tx.testCall.count({ where: { clientServiceId, createdAt: { gte: since } } });
      if (recent >= TEST_CALLS_PER_DAY) {
        throw actionError("testLimit", { count: TEST_CALLS_PER_DAY });
      }
      const testCall = await tx.testCall.create({
        data: { clientServiceId, requestedById: session.user.id },
      });
      return { testCall, recent };
    });

    if (isDemoCallDryRun()) {
      console.info(`[test] mode sans appel : le test ${testCall.id} n'appelle personne.`);
      await db.testCall.update({ where: { id: testCall.id }, data: { status: "CALLING" } });
      return { displayNumber: formatFrenchPhone(to), remaining: TEST_CALLS_PER_DAY - recent - 1 };
    }

    try {
      const sid = await placeDemoCall({
        to,
        from: process.env.DEMO_CALLER_NUMBER!,
        twiml: buildDemoTwiml(process.env.OPENAI_SIP_URI!, testCall.id, TEST_SIP_HEADER),
        timeLimitSec: DEMO_TIME_LIMIT_SEC,
      });
      await db.testCall.update({ where: { id: testCall.id }, data: { status: "CALLING", twilioCallSid: sid } });
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? err.code : "inconnu";
      console.error(`[test] échec de l'appel sortant ${testCall.id} (code Twilio ${code}).`);
      await db.testCall.delete({ where: { id: testCall.id } });
      throw actionError("callFailed");
    }

    return { displayNumber: formatFrenchPhone(to), remaining: TEST_CALLS_PER_DAY - recent - 1 };
  });
}
