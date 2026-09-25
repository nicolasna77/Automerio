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
import { ActionError, runAction } from "@/lib/run-action";
import { placeDemoCall } from "@/lib/twilio";

const TESTABLE_STATUSES = new Set(["CONFIGURING", "ACTIVE"]);

/**
 * Fait appeler le client par l'agent de sa solution, avec sa configuration
 * actuelle, pour l'entendre avant ses clients. Rien n'est enregistre pendant
 * l'appel (voir `testMode` des outils), et il ne compte pas dans le forfait.
 */
export async function requestTestCallAction(clientServiceId: string, phone: string) {
  return runAction(async () => {
    const session = await requireUser();
    if (!(await assertCanReadClientService(clientServiceId, session.user.id))) {
      throw new ActionError("Cette solution n'appartient pas à votre organisation.");
    }

    const clientService = await db.clientService.findUnique({
      where: { id: clientServiceId },
      select: { status: true, service: { select: { slug: true } } },
    });
    if (!clientService || !TELEPHONY_SERVICE_SLUGS.has(clientService.service.slug)) {
      throw new ActionError("Seules les solutions téléphoniques se testent par un appel.");
    }
    if (!TESTABLE_STATUSES.has(clientService.status)) {
      throw new ActionError("Le test est disponible une fois le paiement confirmé.");
    }

    const to = normalizeFrenchPhone(phone);
    if (!to) {
      throw new ActionError("Saisissez un numéro de mobile ou de fixe français, par exemple 06 12 34 56 78.");
    }
    if (!isDemoCallAvailable()) {
      throw new ActionError("Le test d'appel n'est pas disponible pour le moment. Réessayez plus tard.");
    }

    // Compte en base plutot qu'en memoire : la limite tient d'une instance a
    // l'autre et apres un redemarrage. Le verrou de transaction sur la
    // solution sérialise le comptage et la création : sans lui, des demandes
    // simultanees liraient toutes le meme compte et passeraient la limite.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { testCall, recent } = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${clientServiceId}))`;
      const recent = await tx.testCall.count({ where: { clientServiceId, createdAt: { gte: since } } });
      if (recent >= TEST_CALLS_PER_DAY) {
        throw new ActionError(`Vous avez fait ${TEST_CALLS_PER_DAY} tests aujourd'hui. Réessayez demain.`);
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
      // Un appel qui n'est pas parti ne doit pas consommer un des tests du jour.
      await db.testCall.delete({ where: { id: testCall.id } });
      throw new ActionError("L'appel n'a pas pu être lancé. Vérifiez le numéro, puis réessayez.");
    }

    return { displayNumber: formatFrenchPhone(to), remaining: TEST_CALLS_PER_DAY - recent - 1 };
  });
}
