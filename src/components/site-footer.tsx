import Link from "next/link";
import { AutomerioLogo } from "@/components/brand";

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgv", label: "CGV" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <AutomerioLogo />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Agence d&apos;automatisation pour artisans, coachs, indépendants
            et TPE/PME.
          </p>
        </div>
        <div className="flex gap-16 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground">Offre</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/#prestations" className="hover:text-foreground">
                  Solutions
                </Link>
              </li>
              <li>
                <Link href="/#methode" className="hover:text-foreground">
                  Méthode
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground">Compte</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/contact" className="hover:text-foreground">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Connexion
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-foreground">
                  Inscription
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* Meta demande que rien ne laisse croire a un partenariat ou a un
          agrement des lors qu'on montre ses logos. */}
      <div className="mx-auto max-w-6xl border-t border-border px-4 pt-6 text-xs text-muted-foreground sm:px-6">
        <p>
          WhatsApp, Messenger et Instagram sont des marques de Meta Platforms,
          Inc. Automerio n&apos;est ni affilié à Meta, ni parrainé ou agréé par
          Meta.
        </p>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} Automerio. Tous droits réservés.</p>
        <nav aria-label="Informations légales">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
