"use server";

import { Prisma } from "@prisma/client";
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

const UNAVAILABLE = "L'appel d'essai n'est pas disponible pour le moment. Réessayez plus tard ou écrivez-nous.";

export async function requestDemoCall(input: {
  phone: string;
  serviceSlug: string;
  website: string;
}) {
  return runAction(async () => {
    if (input.website.trim()) return { displayNumber: "" };

    if (!TELEPHONY_SERVICE_SLUGS.has(input.serviceSlug)) throw new ActionError(UNAVAILABLE);
    const phone = normalizeFrenchPhone(input.phone);
    if (!phone) {
      throw new ActionError(
        "Saisissez un numéro de mobile ou de fixe français, par exemple 06 12 34 56 78."
      );
    }
    if (!isDemoCallAvailable()) throw new ActionError(UNAVAILABLE);

    const limits = demoCallLimits();
    const ip = await getClientIp();
    if (!(await checkRateLimit("demo-call", ip, "24 h", limits.perIpPerDay))) {
      throw new ActionError("Trop d'essais demandés depuis cette connexion. Réessayez demain.");
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if ((await db.demoCall.count({ where: { createdAt: { gte: since } } })) >= limits.perDay) {
      throw new ActionError(UNAVAILABLE);
    }

    const phoneHash = hashPhone(phone);
    const alreadyCalled = await db.demoCall.findUnique({ where: { phoneHash }, select: { id: true } });
    if (alreadyCalled) {
      throw new ActionError(
        "Ce numéro a déjà reçu son appel d'essai. Pour aller plus loin, créez votre compte ou écrivez-nous."
      );
    }

    let demoCall;
    try {
      demoCall = await db.demoCall.create({
        data: { phoneHash, ipHash: hashIp(ip), serviceSlug: input.serviceSlug },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ActionError("Ce numéro a déjà reçu son appel d'essai.");
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
      throw new ActionError("L'appel n'a pas pu être lancé. Vérifiez le numéro, puis réessayez.");
    }

    return { displayNumber: formatFrenchPhone(phone) };
  });
}
