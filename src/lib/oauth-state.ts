import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

const SEPARATOR = ".";
const PART_COUNT = 5;

// Le state voyage chez Google / Instagram et revient tel quel : il désigne la
// solution, la personne qui a lancé la connexion, l'instant d'émission et un
// nonce. Le nonce est aussi posé dans un cookie HttpOnly par la route de
// connexion ; le callback exige les deux et efface le cookie, si bien qu'un
// state ne sert qu'une fois, et seulement dans le navigateur qui l'a demandé.
export type SignedOAuthState = { state: string; nonce: string };

export type OAuthStateExpectation = {
  userId: string;
  nonce: string | null | undefined;
};

// Encodés pour qu'un identifiant contenant un point ne décale pas les segments.
function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

export function signOAuthState(
  secret: string,
  clientServiceId: string,
  userId: string,
  now: number = Date.now()
): SignedOAuthState {
  const nonce = randomBytes(16).toString("hex");
  const payload = [encode(clientServiceId), encode(userId), String(now), nonce].join(
    SEPARATOR
  );
  return { state: `${payload}${SEPARATOR}${sign(secret, payload)}`, nonce };
}

export function verifyOAuthState(
  secret: string,
  state: string,
  expected: OAuthStateExpectation,
  now: number = Date.now()
): string | null {
  const parts = state.split(SEPARATOR);
  if (parts.length !== PART_COUNT) return null;

  const [encodedServiceId, encodedUserId, issuedAtText, nonce, signature] = parts;
  if (!encodedServiceId || !encodedUserId || !issuedAtText || !nonce || !signature) {
    return null;
  }

  const payload = [encodedServiceId, encodedUserId, issuedAtText, nonce].join(SEPARATOR);
  if (!safeEqual(sign(secret, payload), signature)) return null;

  const issuedAt = Number(issuedAtText);
  if (!Number.isFinite(issuedAt)) return null;
  const age = now - issuedAt;
  if (age < 0 || age > OAUTH_STATE_TTL_MS) return null;

  if (!expected.nonce || !safeEqual(nonce, expected.nonce)) return null;
  if (!safeEqual(decode(encodedUserId), expected.userId)) return null;

  return decode(encodedServiceId) || null;
}

// Options du cookie qui porte le nonce entre la route de connexion et le
// callback : illisible par le JavaScript de la page, limité aux routes de
// l'intégration, et pas plus durable que le state lui-même. SameSite=Lax
// suffit : le retour du fournisseur est une navigation de premier niveau.
export function oauthNonceCookieOptions(path: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path,
    maxAge: OAUTH_STATE_TTL_MS / 1000,
  };
}
