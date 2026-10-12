import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import type { Configuration } from "@/lib/catalog";
import { customerSmsEnabled } from "@/lib/booking-sms";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendSms, smsRecipient } from "@/lib/sms";

// L'assistant ne décroche pas (mis en pause, forfait épuisé) : l'appelant
// reçoit un SMS au lieu de perdre le contact après le message vocal. Un SMS
// par appelant et par solution toutes les 6 heures, seulement vers un mobile,
// et jamais si le réglage « SMS à vos clients » est coupé.
export const MISSED_CALL_SMS_WINDOW = "6 h";

export async function sendMissedCallSms(input: {
  clientService: { id: string; configuration: unknown; organization: { name: string } };
  from: string | null | undefined;
}): Promise<boolean> {
  const recipient = smsRecipient(input.from);
  const configuration = (input.clientService.configuration ?? {}) as Configuration;
  if (!recipient || !customerSmsEnabled(configuration)) return false;
  const allowed = await checkRateLimit(
    "missed-call-sms",
    `${input.clientService.id}:${recipient}`,
    MISSED_CALL_SMS_WINDOW,
    1
  );
  if (!allowed) return false;

  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Sms" });
  return sendSms(recipient, t("missedCall", { company: input.clientService.organization.name }));
}
