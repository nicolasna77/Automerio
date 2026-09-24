/**
 * Ou renvoyer un visiteur une fois connecte.
 *
 * Le parametre `next` arrive par l'URL : n'importe qui peut en fabriquer un.
 * On n'accepte donc qu'un chemin relatif de l'application, dans l'un des deux
 * espaces connectes — jamais une autre origine (`//evil.fr`, `https://…`),
 * sans quoi la page de connexion deviendrait un tremplin vers un site tiers
 * (« open redirect »), qui plus est juste apres la saisie d'un mot de passe.
 */
const ALLOWED_PREFIXES = ["/dashboard", "/admin"];
const PROBE_ORIGIN = "http://automerio.invalid";

export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  // `//hote` et `/\hote` sont des URL absolues pour un navigateur.
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

/** `/login` ou `/signup`, avec la destination a retrouver apres coup. */
export function authPathWithNext(path: "/login" | "/signup", next: string | null): string {
  const safe = safeNextPath(next);
  return safe ? `${path}?next=${encodeURIComponent(safe)}` : path;
}

/** La page d'activation d'une solution, avec le volume deja choisi. */
export function activationPath(slug: string, units?: number | null): string {
  const base = `/dashboard/prestations/activer/${encodeURIComponent(slug)}`;
  return units ? `${base}?minutes=${units}` : base;
}
