import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Lecture rapide : better-auth peut répondre depuis le cookie de cache de
// session (5 min, voir `session.cookieCache` dans auth.ts). Suffisant pour
// l'espace client, où chaque donnée est de toute façon scopée par organisation.
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

// Lecture qui ignore le cookie de cache et relit la session en base : un
// administrateur rétrogradé ou banni (ses sessions sont alors révoquées) perd
// ses droits immédiatement, et non à l'expiration du cache.
const getFreshSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function isAdmin(user: { role?: string | null }): boolean {
  return user.role === "ADMIN";
}

// Désactivable avec ADMIN_REQUIRE_2FA=false (tests de bout en bout : le
// compte administrateur de démonstration n'a pas de double authentification).
export function isAdminTwoFactorRequired(source: Record<string, string | undefined> = process.env): boolean {
  return source.ADMIN_REQUIRE_2FA?.trim().toLowerCase() !== "false";
}

export const ADMIN_TWO_FACTOR_SETUP_PATH = "/dashboard/profile#two-factor";

export async function requireAdmin() {
  const session = await getFreshSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.user)) redirect("/dashboard");
  if (isAdminTwoFactorRequired() && !session.user.twoFactorEnabled) {
    redirect(ADMIN_TWO_FACTOR_SETUP_PATH);
  }
  return session;
}
