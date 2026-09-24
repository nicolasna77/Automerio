export const CLIENT = { email: "marc.lefevre@example.com", password: "password123" };
export const ADMIN = { email: "equipe@automerio.test", password: "password123" };

export const CLIENT_STATE = "e2e/.auth/client.json";
export const ADMIN_STATE = "e2e/.auth/admin.json";

export const ANONYMOUS = { cookies: [], origins: [] };

/**
 * Une adresse client a part pour un test qui se connecte ou s'inscrit.
 *
 * better-auth limite les connexions par adresse (3 par tranche de 10 s). Sans
 * en-tete `x-forwarded-for`, le serveur de test ne sait pas d'ou viennent les
 * requetes et range tout le monde dans le meme compteur : quatre connexions
 * rapprochees suffisaient a en bloquer une, au hasard. En production, Vercel
 * pose lui-meme cet en-tete ; rien ne change cote application.
 */
export function isolatedClientIp(): Record<string, string> {
  const octet = () => Math.floor(Math.random() * 250) + 1;
  return { "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}` };
}
