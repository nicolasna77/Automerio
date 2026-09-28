import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AutomerioLogo } from "@/components/brand";

const LEGAL_LINKS = [
  { href: "/legal-notice", key: "legalNotice" },
  { href: "/terms", key: "terms" },
  { href: "/privacy", key: "privacy" },
  { href: "/cookies", key: "cookies" },
] as const;

export async function SiteFooter() {
  const [t, tSite] = await Promise.all([getTranslations("Footer"), getTranslations("Site")]);
  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <AutomerioLogo />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("tagline")}
          </p>
        </div>
        <div className="flex gap-16 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground">{t("offer")}</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/#services" className="hover:text-foreground">
                  {t("solutions")}
                </Link>
              </li>
              <li>
                <Link href="/#method" className="hover:text-foreground">
                  {t("method")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground">{t("account")}</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/contact" className="hover:text-foreground">
                  {t("contact")}
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground">
                  {t("login")}
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-foreground">
                  {t("signup")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl border-t border-border px-4 pt-6 text-xs text-muted-foreground sm:px-6">
        <p>
          {t("metaDisclaimer")}
        </p>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>{t("copyright", { year: new Date().getFullYear() })}</p>
        <nav aria-label={tSite("legalNavLabel")}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-foreground">
                  {t(`legal.${link.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
