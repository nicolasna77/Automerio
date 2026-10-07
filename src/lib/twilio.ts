import twilioLib from "twilio";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  if (!accountSid || !apiKeySid || !apiKeySecret) {
    throw new Error(
      "TWILIO_ACCOUNT_SID / TWILIO_API_KEY_SID / TWILIO_API_KEY_SECRET manquants"
    );
  }
  return twilioLib(apiKeySid, apiKeySecret, { accountSid });
}

export function voiceWebhookUrl(): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${appUrl}/api/voice/incoming`;
}

export function validateTwilioRequest(
  signature: string | null,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) return false;
  return twilioLib.validateRequest(authToken, signature, voiceWebhookUrl(), params);
}

export type AvailableNumber = {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
};

export async function searchAvailableNumbers(limit = 10): Promise<AvailableNumber[]> {
  const numbers = await getTwilioClient()
    .availablePhoneNumbers("FR")
    .local.list({ limit });

  return numbers.map((n) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality ?? null,
    region: n.region ?? null,
  }));
}

// Numéro géographique ou non géographique français au format E.164.
const FRENCH_E164 = /^\+33[1-9]\d{8}$/;

export function isFrenchE164(phoneNumber: unknown): phoneNumber is string {
  return typeof phoneNumber === "string" && FRENCH_E164.test(phoneNumber);
}

// « PhoneNumber is not available » : le numéro n'appartient pas (ou plus) au
// stock achetable de Twilio — https://www.twilio.com/docs/api/errors/21422
export const TWILIO_NUMBER_NOT_AVAILABLE = 21422;

export class PhoneNumberUnavailableError extends Error {
  constructor(phoneNumber: string) {
    super(`Numéro ${phoneNumber} plus disponible chez Twilio`);
    this.name = "PhoneNumberUnavailableError";
  }
}

function twilioErrorCode(err: unknown): number | null {
  if (typeof err !== "object" || err === null || !("code" in err)) return null;
  const code = Number((err as { code: unknown }).code);
  return Number.isFinite(code) ? code : null;
}

// Pas de vérification préalable de disponibilité : la recherche Twilio par
// motif n'est pas exacte et le numéro peut partir entre-temps. On tente
// l'achat, et Twilio répond 21422 si le numéro n'est plus achetable.
export async function purchasePhoneNumber(
  phoneNumber: string
): Promise<{ sid: string; phoneNumber: string }> {
  if (!isFrenchE164(phoneNumber)) {
    throw new Error("Numéro refusé : seul un numéro français au format E.164 peut être acheté");
  }
  try {
    const purchased = await getTwilioClient().incomingPhoneNumbers.create({
      phoneNumber,
      voiceUrl: voiceWebhookUrl(),
    });
    return { sid: purchased.sid, phoneNumber: purchased.phoneNumber };
  } catch (err) {
    if (twilioErrorCode(err) === TWILIO_NUMBER_NOT_AVAILABLE) {
      throw new PhoneNumberUnavailableError(phoneNumber);
    }
    throw err;
  }
}

export async function releasePhoneNumber(sid: string): Promise<void> {
  try {
    await getTwilioClient().incomingPhoneNumbers(sid).remove();
  } catch {
  }
}

export async function placeDemoCall(input: {
  to: string;
  from: string;
  twiml: string;
  timeLimitSec: number;
}): Promise<string> {
  const call = await getTwilioClient().calls.create({
    to: input.to,
    from: input.from,
    twiml: input.twiml,
    timeLimit: input.timeLimitSec,
  });
  return call.sid;
}
