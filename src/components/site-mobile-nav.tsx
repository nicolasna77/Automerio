"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Menu } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AutomerioLogo } from "@/components/brand";
import { MobileNavLink } from "@/components/mobile-nav-link";
import { ServiceGlyph } from "@/components/service-glyph";
import { useTranslations } from "next-intl";
import type { ServiceCategory, ServiceMenuItem } from "@/lib/catalog";
import { SITE_NAV_LINKS } from "@/lib/site";

const MENU_CATEGORIES: ServiceCategory[] = ["COMMUNICATION", "INFORMATION"];

export function SiteMobileNav({
  services,
  loggedIn,
}: {
  services: ServiceMenuItem[];
  loggedIn: boolean;
}) {
  const t = useTranslations("Site");
  const tCatalog = useTranslations("Catalog");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 lg:hidden"
            aria-label={t("menu.open")}
          />
        }
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>

      <SheetContent side="left" className="w-[85vw] max-w-sm">
        <SheetHeader>
          <SheetTitle className="sr-only">{t("menu.title")}</SheetTitle>
          <AutomerioLogo />
        </SheetHeader>
        <SheetBody>
          <nav aria-label={t("mainNavLabel")} className="flex flex-col gap-6 text-sm">
            {MENU_CATEGORIES.map((category) => {
              const categoryServices = services.filter((s) => s.category === category);
              if (categoryServices.length === 0) return null;

              return (
                <div key={category}>
                  <p className="mb-1 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {tCatalog(`categories.${category}`)}
                  </p>
                  <ul className="flex flex-col">
                    {categoryServices.map((service) => (
                      <li key={service.slug}>
                        <MobileNavLink
                          href={`/services/${service.slug}`}
                          icon={
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                              <ServiceGlyph slug={service.slug} className="size-4" />
                            </span>
                          }
                        >
                          {service.name}
                        </MobileNavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            <ul className="flex flex-col border-t border-border pt-4">
              {SITE_NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <MobileNavLink href={link.href}>{t(`nav.${link.key}`)}</MobileNavLink>
                </li>
              ))}
            </ul>
          </nav>
        </SheetBody>
        <SheetFooter className="border-t border-border">
          {loggedIn ? (
            <SheetClose
              render={<Link href="/dashboard" />}
              nativeButton={false}
              className={buttonVariants({ size: "lg", className: "w-full" })}
            >
              {t("nav.dashboard")}
            </SheetClose>
          ) : (
            <div className="grid gap-2">
              <SheetClose
                render={<Link href="/signup" />}
                nativeButton={false}
                className={buttonVariants({ size: "lg", className: "w-full" })}
              >
                {t("auth.signup")}
              </SheetClose>
              <SheetClose
                render={<Link href="/login" />}
                nativeButton={false}
                className={buttonVariants({ size: "lg", variant: "outline", className: "w-full" })}
              >
                {t("auth.login")}
              </SheetClose>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
