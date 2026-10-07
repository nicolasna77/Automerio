// Valeurs acceptées pour `user.image`, quel que soit le chemin d'écriture
// (formulaire du profil, appel direct à /api/auth/update-user, connexion
// Google) : rien, une photo encodée par le formulaire du profil (JPEG 256 px),
// ou la photo de profil Google.

export const MAX_AVATAR_DATA_URL_LENGTH = 150 * 1024;

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const GOOGLE_PHOTO_HOST = "lh3.googleusercontent.com";

export function isAcceptableAvatar(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value !== "string") return false;

  if (value.startsWith("data:")) {
    return value.length <= MAX_AVATAR_DATA_URL_LENGTH && DATA_URL.test(value);
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === GOOGLE_PHOTO_HOST && url.port === "";
  } catch {
    return false;
  }
}
