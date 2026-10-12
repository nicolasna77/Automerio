"use server";

import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { assertCanReadClientService } from "@/lib/client-service-access";
import { actionError, runAction } from "@/lib/run-action";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeFrenchPhone } from "@/lib/demo-call";
import { placeOutboundCall } from "@/lib/twilio";
import { LIVE_STATUSES } from "@/lib/catalog";
import { LISTED_CALL_TYPES } from "@/lib/missed-calls";
import { buildBridgeTwiml, CALLBACKS_PER_DAY, CALLBACK_TIME_LIMIT_SEC } from "@/lib/callback-bridge";

// Rappel en un clic : fait sonner le mobile indiqué, puis met en relation
// avec l'appelant, qui voit le numéro de la solution. Tout membre de
// l'organisation peut rappeler ; 20 rappels par solution et par jour.
export async function bridgeCallback(callId: string, mobile: string) {
  return runAction(async () => {
    const session = await requireUser();

    const call = await db.usageEvent.findUnique({
      where: { id: callId },
      select: {
        type: true,
        metadata: true,
        clientServiceId: true,
        clientService: { select: { externalPhoneNumber: true, status: true, name: true } },
      },
    });
    if (!call || !(await assertCanReadClientService(call.clientServiceId, session.user.id))) {
      throw actionError("notYourService");
    }
    if (!(LISTED_CALL_TYPES as readonly string[]).includes(call.type)) throw actionError("callNotFound");

    const metadata = (call.metadata ?? {}) as Record<string, unknown>;
    const customerNumber = typeof metadata.fromNumber === "string" ? metadata.fromNumber : null;
    const solutionNumber = call.clientService.externalPhoneNumber;
    if (!customerNumber) throw actionError("callbackHiddenNumber");
    if (!solutionNumber || !(LIVE_STATUSES as readonly string[]).includes(call.clientService.status)) {
      throw actionError("callbackUnavailable");
    }

    const to = normalizeFrenchPhone(mobile);
    if (!to) throw actionError("callbackMobileInvalid");
    if (to === customerNumber || to === solutionNumber) throw actionError("callbackMobileInvalid");

    if (!(await checkRateLimit("callback-bridge", call.clientServiceId, "24 h", CALLBACKS_PER_DAY))) {
      throw actionError("tooManyCallbacks", { count: CALLBACKS_PER_DAY });
    }

    const t = await getTranslations("Voice");
    try {
      await placeOutboundCall({
        to,
        from: solutionNumber,
        twiml: buildBridgeTwiml({
          announce: t("bridgeAnnounce", { service: call.clientService.name }),
          customerNumber,
          callerId: solutionNumber,
        }),
        timeLimitSec: CALLBACK_TIME_LIMIT_SEC,
      });
    } catch (err) {
      console.error(`[rappel] appel ${callId} : mise en relation impossible`, err);
      throw actionError("callbackFailed");
    }
  });
}
