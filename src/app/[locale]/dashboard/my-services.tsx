"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  type ClientServiceStatus,
  type MyServiceDTO,
} from "@/lib/catalog";
import { MyServiceRow, SOLUTION_COLUMNS } from "./my-service-row";
import { CATALOGUE_PATH } from "./services/paths";

const STATUS_ORDER: ClientServiceStatus[] = [
  "PENDING_PAYMENT",
  "CONFIGURING",
  "ACTIVE",
  "CANCELED",
];

// Au-delà de ce nombre de solutions, une recherche par nom devient utile.
const SEARCH_THRESHOLD = 6;

type StatusFilter = ClientServiceStatus | "all";

export function MyServices({ items }: { items: MyServiceDTO[] }) {
  const t = useTranslations("Dashboard.services.list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const ordered = useMemo(
    () =>
      items.toSorted(
        (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      ),
    [items]
  );

  const counts = useMemo(() => {
    const byStatus = new Map<ClientServiceStatus, number>();
    for (const item of items) byStatus.set(item.status, (byStatus.get(item.status) ?? 0) + 1);
    return byStatus;
  }, [items]);

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = ordered.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesSearch =
      !normalizedSearch ||
      item.name.toLowerCase().includes(normalizedSearch) ||
      item.service.name.toLowerCase().includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });

  const filters: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: t("all"), count: items.length },
    ...STATUS_ORDER.filter((status) => counts.has(status)).map((status) => ({
      value: status,
      label: STATUS_LABELS[status],
      count: counts.get(status) ?? 0,
    })),
  ];
  // Un seul statut présent : le filtre « Toutes » suffirait, on masque la barre.
  const showStatusFilters = filters.length > 2;
  const showSearch = items.length >= SEARCH_THRESHOLD;

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <section aria-labelledby="my-services-heading">
      <h2 id="my-services-heading" className="sr-only">
        {t("heading")}
      </h2>

      {(showStatusFilters || showSearch) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {showStatusFilters && (
            <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap gap-1.5">
              {filters.map((filter) => {
                const active = statusFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatusFilter(filter.value)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active
                        ? "border-foreground/80 bg-foreground text-background"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {filter.label}
                    <span
                      className={cn(
                        "font-mono text-xs tabular-nums",
                        active ? "text-background/70" : "text-muted-foreground"
                      )}
                    >
                      {filter.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {showSearch && (
            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchLabel")}
                className="pl-9"
              />
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href={CATALOGUE_PATH} className={buttonVariants({ variant: "outline", size: "sm" })}>
              {t("seeCatalog")}
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          tone="neutral"
          title={t("noMatchTitle")}
          description={t("noMatchDescription")}
          action={
            <Button variant="outline" size="sm" onClick={resetFilters}>
              {t("reset")}
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div
            aria-hidden="true"
            className="hidden border-b border-border bg-muted/40 px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid md:grid-cols-(--solution-cols) md:gap-6"
            style={{ "--solution-cols": SOLUTION_COLUMNS } as React.CSSProperties}
          >
            <span className="pl-9">{t("columns.service")}</span>
            <span>{t("columns.status")}</span>
            <span>{t("columns.number")}</span>
            <span className="text-right">{t("columns.price")}</span>
            <span />
          </div>
          <ul className="divide-y divide-border">
            {filtered.map((item) => (
              <MyServiceRow key={item.clientServiceId} item={item} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

