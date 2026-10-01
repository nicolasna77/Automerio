export function isWaitlistMode(): boolean {
  return process.env.WAITLIST_MODE === "true";
}

const PUBLIC_PATHS = new Set([
  "/",
  "/privacy",
  "/terms",
  "/legal-notice",
  "/cookies",
  "/opengraph-image",
  "/login",
  "/login/verification",
  "/forgot-password",
  "/reset-password",
]);

export function isOpenDuringWaitlist(path: string): boolean {
  const normalized = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return (
    PUBLIC_PATHS.has(normalized) ||
    normalized === "/admin" ||
    normalized.startsWith("/admin/") ||
    // Pages par métier : ouvertes pour être référencées avant le lancement.
    normalized.startsWith("/industries/")
  );
}
