import { PageBreadcrumbs, type Breadcrumb } from "@/components/header-breadcrumbs";
import { cn } from "@/lib/utils";

const SIZES = {
  // Pages centrées, avec les mêmes marges partout ; seule la largeur varie.
  form: "mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8",
  content: "mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8",
  // Tableaux de bord : grilles et listes profitent des grands écrans. Les
  // textes longs gardent leur propre limite (max-w-2xl) pour rester lisibles.
  wide: "mx-auto max-w-[96rem] px-4 py-10 sm:px-6 lg:px-8",
  full: "flex h-[calc(100svh-3.5rem)] flex-col px-4 py-10 sm:px-6 lg:px-8",
} as const;

export type PageShellSize = keyof typeof SIZES;

export function PageShell({
  size = "wide",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { size?: PageShellSize }) {
  return (
    <div className={cn(SIZES[size], className)} {...props}>
      {children}
    </div>
  );
}

// Le fil d'Ariane s'affiche dans la barre du haut (header-breadcrumbs.tsx) ;
// une page le fournit quand son titre vient des données.
export { PageBreadcrumbs, type Breadcrumb } from "@/components/header-breadcrumbs";
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
