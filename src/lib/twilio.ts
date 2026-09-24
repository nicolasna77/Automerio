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

export async function purchasePhoneNumber(
  phoneNumber: string
): Promise<{ sid: string; phoneNumber: string }> {
  const purchased = await getTwilioClient().incomingPhoneNumbers.create({
    phoneNumber,
    voiceUrl: voiceWebhookUrl(),
  });
  return { sid: purchased.sid, phoneNumber: purchased.phoneNumber };
}

export async function releasePhoneNumber(sid: string): Promise<void> {
  try {
    await getTwilioClient().incomingPhoneNumbers(sid).remove();
  } catch {
  }
}

/**
 * Appelle un visiteur pour un essai. `timeLimit` est applique par Twilio : le
 * cout d'un essai est borne meme si notre serveur ne reprend jamais la main.
 */
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
