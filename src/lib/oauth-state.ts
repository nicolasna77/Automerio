import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

const SEPARATOR = ".";
const PART_COUNT = 4;

export function signOAuthState(
  secret: string,
  clientServiceId: string,
  now: number = Date.now()
): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = `${clientServiceId}${SEPARATOR}${now}${SEPARATOR}${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}${SEPARATOR}${signature}`;
}

export function verifyOAuthState(
  secret: string,
  state: string,
  now: number = Date.now()
): string | null {
  const parts = state.split(SEPARATOR);
  if (parts.length !== PART_COUNT) return null;

  const [clientServiceId, issuedAtText, nonce, signature] = parts;
  if (!clientServiceId || !issuedAtText || !nonce || !signature) return null;

  const payload = `${clientServiceId}${SEPARATOR}${issuedAtText}${SEPARATOR}${nonce}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, signatureBuf)) return null;

  const issuedAt = Number(issuedAtText);
  if (!Number.isFinite(issuedAt)) return null;
  const age = now - issuedAt;
  if (age < 0 || age > OAUTH_STATE_TTL_MS) return null;

  return clientServiceId;
}
