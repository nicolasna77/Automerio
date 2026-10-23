import { Fragment, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type SiteBreadcrumbItem = {
  label: string;
  href?: string;
  // La page où l'on se trouve (aria-current) ; un niveau sans lien n'en est
  // pas forcément une (la catégorie d'une solution, par exemple).
  current?: boolean;
};

// Fil d'Ariane des pages publiques (solution, métier) : une pastille, une
// barre oblique entre les niveaux, le dernier niveau en texte plein. Une seule
// allure pour un même repère, d'une page à l'autre.
export function SiteBreadcrumb({
  label,
  items,
  icon,
  className,
}: {
  label: string;
  items: SiteBreadcrumbItem[];
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] text-muted-foreground shadow-sm">
        {icon && (
          <li aria-hidden="true" className="flex">
            {icon}
          </li>
        )}
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 && <li aria-hidden="true">/</li>}
            <li
              aria-current={item.current ? "page" : undefined}
              className={cn(!item.href && "text-foreground")}
            >
              {item.href ? (
                <Link
                  href={item.href}
                  className="rounded-sm transition-colors hover:text-foreground focus-visible:focus-ring active:opacity-70"
                >
                  {item.label}
                </Link>
              ) : (
                item.label
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
