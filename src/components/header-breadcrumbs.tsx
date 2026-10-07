"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type Breadcrumb = { label: string; href?: string };

type BreadcrumbOverride = {
  items: Breadcrumb[] | null;
  setItems: (items: Breadcrumb[] | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbOverride | null>(null);

// Partagé par la barre du haut et la page : une page dont le titre vient des
// données (une solution, un utilisateur) y dépose son propre fil d'Ariane.
export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Breadcrumb[] | null>(null);
  return <BreadcrumbContext.Provider value={{ items, setItems }}>{children}</BreadcrumbContext.Provider>;
}

// Fil d'Ariane de la barre du haut, à côté du bouton de la barre latérale.
// Par défaut, il se déduit de l'adresse : chaque page connue (`pages`) dont
// le chemin préfixe l'adresse courante forme un maillon. Sur mobile, seul le
// dernier maillon reste affiché.
export function HeaderBreadcrumbs({
  root,
  pages,
}: {
  root: { label: string; href: string };
  pages: Record<string, string>;
}) {
  const t = useTranslations("Workspace");
  const pathname = usePathname();
  const override = useContext(BreadcrumbContext)?.items;

  const trail =
    override ??
    Object.entries(pages)
      .filter(([path]) => path === pathname || (path !== root.href && pathname.startsWith(`${path}/`)))
      .sort(([a], [b]) => a.length - b.length)
      .map(([href, label]) => ({ label, href }));
  const items: Breadcrumb[] = [root, ...trail];

  return (
    <nav aria-label={t("breadcrumb")} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className={cn("min-w-0 items-center gap-1.5", isLast ? "flex" : "hidden md:flex")}
            >
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="truncate rounded-sm transition-colors hover:text-foreground focus-visible:focus-ring"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="truncate font-medium text-foreground" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Fil d'Ariane fourni par une page (après la racine de l'espace) : il
// remplace celui déduit de l'adresse dans la barre du haut, le temps que la
// page est affichée. Rien n'est rendu dans la page elle-même.
export function PageBreadcrumbs({ items }: { items: Breadcrumb[] }) {
  const setItems = useContext(BreadcrumbContext)?.setItems;
  const key = JSON.stringify(items);
  useLayoutEffect(() => {
    if (!setItems) return;
    setItems(JSON.parse(key) as Breadcrumb[]);
    return () => setItems(null);
  }, [key, setItems]);
  return null;
}
