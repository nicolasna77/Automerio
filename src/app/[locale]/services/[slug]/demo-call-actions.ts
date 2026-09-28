"use server";

import { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { TELEPHONY_SERVICE_SLUGS } from "@/lib/catalog";
import { db } from "@/lib/db";
import {
  DEMO_TIME_LIMIT_SEC,
  buildDemoTwiml,
  demoCallLimits,
  formatFrenchPhone,
  hashIp,
  hashPhone,
  isDemoCallAvailable,
  isDemoCallDryRun,
  normalizeFrenchPhone,
} from "@/lib/demo-call";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { ActionError, runAction } from "@/lib/run-action";
import { placeDemoCall } from "@/lib/twilio";

export async function requestDemoCall(input: {
  phone: string;
  serviceSlug: string;
  website: string;
}) {
  return runAction(async () => {
    if (input.website.trim()) return { displayNumber: "" };
    const t = await getTranslations("DemoCall.errors");

    if (!TELEPHONY_SERVICE_SLUGS.has(input.serviceSlug)) throw new ActionError(t("unavailable"));
    const phone = normalizeFrenchPhone(input.phone);
    if (!phone) {
      throw new ActionError(t("invalidNumber"));
    }
    if (!isDemoCallAvailable()) throw new ActionError(t("unavailable"));

    const limits = demoCallLimits();
    const ip = await getClientIp();
    if (!(await checkRateLimit("demo-call", ip, "24 h", limits.perIpPerDay))) {
      throw new ActionError(t("tooManyFromIp"));
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if ((await db.demoCall.count({ where: { createdAt: { gte: since } } })) >= limits.perDay) {
      throw new ActionError(t("unavailable"));
    }

    const phoneHash = hashPhone(phone);
    const alreadyCalled = await db.demoCall.findUnique({ where: { phoneHash }, select: { id: true } });
    if (alreadyCalled) {
      throw new ActionError(t("alreadyCalledLong"));
    }

    let demoCall;
    try {
      demoCall = await db.demoCall.create({
        data: { phoneHash, ipHash: hashIp(ip), serviceSlug: input.serviceSlug },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ActionError(t("alreadyCalled"));
      }
      throw err;
    }

    if (isDemoCallDryRun()) {
      console.info(`[essai] mode sans appel : l'essai ${demoCall.id} n'appelle personne.`);
      await db.demoCall.update({ where: { id: demoCall.id }, data: { status: "CALLING" } });
      return { displayNumber: formatFrenchPhone(phone) };
    }

    try {
      const sid = await placeDemoCall({
        to: phone,
        from: process.env.DEMO_CALLER_NUMBER!,
        twiml: buildDemoTwiml(process.env.OPENAI_SIP_URI!, demoCall.id),
        timeLimitSec: DEMO_TIME_LIMIT_SEC,
      });
      await db.demoCall.update({
        where: { id: demoCall.id },
        data: { status: "CALLING", twilioCallSid: sid },
      });
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? err.code : "inconnu";
      console.error(`[essai] échec de l'appel sortant ${demoCall.id} (code Twilio ${code}).`);
      await db.demoCall.delete({ where: { id: demoCall.id } });
      throw new ActionError(t("callFailed"));
    }

    return { displayNumber: formatFrenchPhone(phone) };
  });
}
