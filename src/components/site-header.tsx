import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AutomerioLogo } from "@/components/brand";
import { ServicesMenu } from "@/components/services-menu";
import { SiteMobileNav } from "@/components/site-mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getSession, isAdmin } from "@/lib/session";
import { getCatalog } from "@/lib/get-catalog";
import { SITE_NAV_LINKS } from "@/lib/site";
import { isWaitlistMode } from "@/lib/launch-mode";

export async function SiteHeader() {
  const waitlist = isWaitlistMode();
  const [session, catalog, t, tWaitlist] = await Promise.all([
    getSession(),
    getCatalog(),
    getTranslations("Site"),
    getTranslations("Waitlist"),
  ]);
  const services = waitlist ? [] : catalog.map(({ slug, name, category }) => ({ slug, name, category }));
  const user = session
    ? {
        name: session.user.name,
        email: session.user.email,
        isAdmin: isAdmin(session.user),
      }
    : null;

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60 focus:rounded-2xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        {t("skipToContent")}
      </a>
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-1">
            <SiteMobileNav services={services} loggedIn={!!user} waitlist={waitlist} />
            <AutomerioLogo />
          </div>

          <nav
            aria-label={t("mainNavLabel")}
            className="ml-8 hidden items-center gap-6 text-sm text-muted-foreground lg:flex"
          >
            {!waitlist && <ServicesMenu services={services} />}
            {SITE_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md transition-colors hover:text-foreground focus-visible:focus-ring"
              >
                {t(`nav.${link.key}`)}
              </Link>
            ))}
            {user && !waitlist && (
              <Link
                href="/dashboard"
                className="rounded-md transition-colors hover:text-foreground focus-visible:focus-ring"
              >
                {t("nav.dashboard")}
              </Link>
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {user ? (
              <UserMenu
                name={user.name}
                email={user.email}
                isAdmin={user.isAdmin}
              />
            ) : waitlist ? (
              <Link href="/#waitlist" className={buttonVariants({ className: "h-10 px-4 sm:h-9" })}>
                <span className="sm:hidden">{tWaitlist("ctaShort")}</span>
                <span className="hidden sm:inline">{tWaitlist("cta")}</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonVariants({
                    variant: "ghost",
                    className: "hidden sm:inline-flex",
                  })}
                >
                  {t("auth.login")}
                </Link>
                <Link
                  href="/signup"
                  className={buttonVariants({ className: "h-10 px-4 sm:h-9" })}
                >
                  <span className="sm:hidden">{t("auth.signupShort")}</span>
                  <span className="hidden sm:inline">{t("auth.signup")}</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
