import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AutomerioLogo } from "@/components/brand";
import { PrestationsMenu } from "@/components/prestations-menu";
import { SiteMobileNav } from "@/components/site-mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getSession, isAdmin } from "@/lib/session";
import { getCatalog } from "@/lib/get-catalog";
import { SITE_NAV_LINKS } from "@/lib/site";

export async function SiteHeader() {
  const [session, services] = await Promise.all([getSession(), getCatalog()]);
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
      href="#contenu"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60 focus:rounded-2xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
    >
      Aller au contenu
    </a>
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-1">
          <SiteMobileNav
            services={services}
            loggedIn={!!user}
          />
          <AutomerioLogo />
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <PrestationsMenu services={services} />
          {SITE_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              href="/dashboard"
              className="rounded-md transition-colors hover:text-foreground"
            >
              Tableau de bord
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <UserMenu
              name={user.name}
              email={user.email}
              isAdmin={user.isAdmin}
            />
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
                Connexion
              </Link>
              <Link href="/signup" className={buttonVariants()}>
                Créer mon compte
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
