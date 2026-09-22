import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Duree de validite d'un state OAuth. Le detour par le fournisseur prend
 * quelques secondes ; un quart d'heure laisse largement le temps a un client
 * de valider l'ecran de consentement, sans laisser trainer un jeton valable
 * indefiniment.
 */
export const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

const SEPARATOR = ".";
const PART_COUNT = 4;

/**
 * Signe l'identifiant d'une prestation pour le confier au fournisseur OAuth,
 * qui nous le rendra tel quel.
 *
 * Trois elements sont signes ensemble : l'identifiant, l'instant d'emission et
 * un alea. L'instant borne la duree pendant laquelle le jeton vaut quelque
 * chose ; l'alea fait qu'un meme identifiant ne produit jamais deux fois la
 * meme chaine, si bien qu'un state intercepte ne revele rien sur les suivants.
 *
 * Ce que cela ne fait pas : empecher le rejeu a l'interieur de la fenetre, qui
 * demanderait de retenir les jetons deja consommes. C'est la session et le
 * controle de propriete, cote callback, qui portent cette garantie.
 */
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

/**
 * Rend l'identifiant de prestation porte par un state valide, ou `null` : la
 * signature ne correspond pas, la forme est inattendue, ou le jeton a expire.
 */
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

  // L'instant n'est lu qu'une fois la signature verifiee : sans quoi on
  // accorderait de l'attention a une valeur que n'importe qui peut ecrire.
  const issuedAt = Number(issuedAtText);
  if (!Number.isFinite(issuedAt)) return null;
  const age = now - issuedAt;
  if (age < 0 || age > OAUTH_STATE_TTL_MS) return null;

  return clientServiceId;
}
