import { normalizeFrenchPhone } from "@/lib/demo-call";
import { sendTwilioSms } from "@/lib/twilio";

// Nom d'expéditeur alphanumérique : 3 à 11 caractères, au moins une lettre
// (règle des opérateurs français et de Twilio).
const SENDER_PATTERN = /^(?=.*[A-Za-z])[A-Za-z0-9 ]{3,11}$/;

export const SMS_MAX_LENGTH = 320;

export function smsSender(): string | null {
  const sender = process.env.TWILIO_SMS_SENDER?.trim();
  return sender && SENDER_PATTERN.test(sender) ? sender : null;
}

// Un nom d'expéditeur alphanumérique ne reçoit pas de réponse et n'atteint
// que les mobiles : seuls les 06 et 07 français sont acceptés.
export function smsRecipient(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const e164 = normalizeFrenchPhone(phone);
  return e164 && /^\+33[67]\d{8}$/.test(e164) ? e164 : null;
}

// Envoi « au mieux » : un SMS qui échoue ne doit jamais faire échouer un
// appel, une réservation ou une tâche planifiée. Renvoie true si Twilio a
// accepté le message.
export async function sendSms(to: string | null | undefined, body: string): Promise<boolean> {
  const sender = smsSender();
  const recipient = smsRecipient(to);
  if (!sender || !recipient) return false;
  try {
    await sendTwilioSms({ to: recipient, from: sender, body: body.slice(0, SMS_MAX_LENGTH) });
    return true;
  } catch (err) {
    console.error("[sms] envoi impossible :", err);
    return false;
  }
}
