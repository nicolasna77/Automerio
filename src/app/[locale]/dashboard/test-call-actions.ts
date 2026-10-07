"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  canManageClientServiceBilling,
  canReadClientService,
  viewerOf,
} from "@/lib/client-service-access";
import { TELEPHONY_SERVICE_SLUGS } from "@/lib/catalog";
import {
  DEMO_TIME_LIMIT_SEC,
  TEST_CALLS_PER_DAY,
  TEST_CALLS_PER_DAY_PER_ORGANIZATION,
  TEST_CALLS_PER_DAY_PER_USER,
  testCallsGlobalPerDay,
  TEST_SIP_HEADER,
  buildDemoTwiml,
  formatFrenchPhone,
  isDemoCallAvailable,
  isDemoCallDryRun,
  normalizeFrenchPhone,
} from "@/lib/demo-call";
import { actionError, runAction } from "@/lib/run-action";
import { placeDemoCall } from "@/lib/twilio";

const TESTABLE_STATUSES = new Set(["CONFIGURING", "ACTIVE"]);

export async function requestTestCallAction(clientServiceId: string, phone: string) {
  return runAction(async () => {
    const session = await requireUser();
    const userId = session.user.id;
    const clientService = await db.clientService.findUnique({
      where: { id: clientServiceId },
      select: { organizationId: true, status: true, service: { select: { slug: true } } },
    });
    const viewer = await viewerOf(userId);
    if (!clientService || !canReadClientService(clientService, viewer)) {
      throw actionError("notYourService");
    }
    // Un appel sortant coûte : seuls les responsables peuvent le déclencher.
    if (!canManageClientServiceBilling(clientService, viewer)) {
      throw actionError("managersOnly");
    }
    const { organizationId } = clientService;
    if (!TELEPHONY_SERVICE_SLUGS.has(clientService.service.slug)) {
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
      // Verrou par organisation : il couvre aussi le plafond par solution.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`test-call:${organizationId}`}))`;
      const recentWhere = { createdAt: { gte: since } };
      const [recent, byOrganization, byUser, overall] = await Promise.all([
        tx.testCall.count({ where: { ...recentWhere, clientServiceId } }),
        tx.testCall.count({ where: { ...recentWhere, clientService: { organizationId } } }),
        tx.testCall.count({ where: { ...recentWhere, requestedById: userId } }),
        tx.testCall.count({ where: recentWhere }),
      ]);
      if (recent >= TEST_CALLS_PER_DAY) {
        throw actionError("testLimit", { count: TEST_CALLS_PER_DAY });
      }
      if (byOrganization >= TEST_CALLS_PER_DAY_PER_ORGANIZATION || byUser >= TEST_CALLS_PER_DAY_PER_USER) {
        throw actionError("testLimitAccount");
      }
      if (overall >= testCallsGlobalPerDay()) {
        throw actionError("testUnavailable");
      }
      const testCall = await tx.testCall.create({
        data: { clientServiceId, requestedById: userId },
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
