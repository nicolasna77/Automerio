import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Chiffrement des secrets de tiers gardés en base (clé API Cal.com, jeton
// Calendly) : une fuite de la base ne doit pas donner accès aux comptes des
// clients. AES-256-GCM, clé dérivée du secret de better-auth : changer ce
// secret rend les secrets stockés illisibles, il faut alors les reconnecter.

const VERSION = "v1";

function key(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET manquant");
  return createHash("sha256").update(`secret-box:${secret}`).digest();
}

export function sealSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, encrypted].map((part) =>
    typeof part === "string" ? part : part.toString("base64url")
  ).join(":");
}

export function openSecret(sealed: string): string {
  const [version, iv, tag, encrypted] = sealed.split(":");
  if (version !== VERSION || !iv || !tag || encrypted === undefined) {
    throw new Error("Secret chiffré illisible");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
