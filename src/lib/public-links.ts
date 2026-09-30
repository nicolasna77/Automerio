import { absoluteUrl } from "@/lib/site";
import { isWaitlistMode } from "@/lib/launch-mode";

// Liens publics donnés aux robots (llms.txt, tarifs, données structurées).
// En mode présentation, les pages des solutions et le contact sont fermés :
// on pointe vers la carte de la solution et le formulaire de la page
// d'accueil, pour qu'un moteur ne suive jamais une redirection.

export function publicServiceUrl(slug: string): string {
  return absoluteUrl(isWaitlistMode() ? `/#${slug}` : `/services/${slug}`);
}

export function publicContactUrl(): string {
  return absoluteUrl(isWaitlistMode() ? "/#waitlist" : "/contact");
}
