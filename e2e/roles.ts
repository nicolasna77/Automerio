export const CLIENT = { email: "marc.lefevre@example.com", password: "password123" };
export const ADMIN = { email: "equipe@automerio.test", password: "password123" };

export const CLIENT_STATE = "e2e/.auth/client.json";
export const ADMIN_STATE = "e2e/.auth/admin.json";

export const ANONYMOUS = { cookies: [], origins: [] };

export function isolatedClientIp(): Record<string, string> {
  const octet = () => Math.floor(Math.random() * 250) + 1;
  return { "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}` };
}
