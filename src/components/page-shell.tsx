import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  form: "mx-auto max-w-3xl px-4 py-10 sm:px-6",
  content: "mx-auto max-w-4xl px-4 py-10 sm:px-6",
  // Tableaux de bord : grilles et listes profitent des grands écrans. Les
  // textes longs gardent leur propre limite (max-w-2xl) pour rester lisibles.
  wide: "mx-auto max-w-[96rem] px-4 py-10 sm:px-6 lg:px-8",
  full: "flex h-[calc(100svh-3.5rem)] flex-col px-4 py-6 sm:px-6",
} as const;

export type PageShellSize = keyof typeof SIZES;

export function PageShell({
  size = "wide",
  className,
  children,
}: {
  size?: PageShellSize;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn(SIZES[size], className)}>{children}</div>;
}

export type Breadcrumb = { label: string; href?: string };

export function PageBreadcrumbs({
  items,
  className,
}: {
  items: Breadcrumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Fil d'Ariane" className={cn("mb-4", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="truncate rounded-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="truncate text-foreground"
                  aria-current={isLast ? "page" : undefined}
                >
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

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  className?: string;
}) {
  return (
    <div className={cn("mb-8", className)}>
      {breadcrumbs && <PageBreadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
            {title}
          </h1>
          {description && (
            <div className="mt-1 max-w-2xl text-pretty text-muted-foreground">
              {description}
            </div>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
