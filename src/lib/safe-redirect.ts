const ALLOWED_PREFIXES = ["/dashboard", "/admin"];
const PROBE_ORIGIN = "http://automerio.invalid";

export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.includes("\\")) return null;

  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PROBE_ORIGIN) return null;

  const inAllowedSpace = ALLOWED_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
  );
  if (!inAllowedSpace) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

export function authPathWithNext(path: "/login" | "/signup", next: string | null): string {
  const safe = safeNextPath(next);
  return safe ? `${path}?next=${encodeURIComponent(safe)}` : path;
}

export function activationPath(slug: string, units?: number | null): string {
  const base = `/dashboard/prestations/activer/${encodeURIComponent(slug)}`;
  return units ? `${base}?minutes=${units}` : base;
}
