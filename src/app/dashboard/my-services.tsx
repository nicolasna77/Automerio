"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, LayoutList, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  type ClientServiceStatus,
  type MyServiceDTO,
} from "@/lib/catalog";
import { MyServiceRow } from "./my-service-row";
import { CATALOGUE_PATH } from "./prestations/paths";

const STATUS_PRIORITY: Record<ClientServiceStatus, number> = {
  PENDING_PAYMENT: 0,
  CONFIGURING: 1,
  ACTIVE: 2,
  CANCELED: 3,
};

const STATUS_FILTER_OPTIONS: ClientServiceStatus[] = [
  "ACTIVE",
  "CONFIGURING",
  "PENDING_PAYMENT",
  "CANCELED",
];

type ViewMode = "list" | "grid";
const VIEW_MODE_STORAGE_KEY = "automerio:my-services-view";
const LEGACY_VIEW_MODE_STORAGE_KEY = "noveris:my-services-view";

export function MyServices({ items }: { items: MyServiceDTO[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientServiceStatus | "all">(
    "all"
  );

  useEffect(() => {
    const legacy = window.localStorage.getItem(LEGACY_VIEW_MODE_STORAGE_KEY);
    if (legacy !== null) {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, legacy);
      window.localStorage.removeItem(LEGACY_VIEW_MODE_STORAGE_KEY);
    }
    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === "grid" || stored === "list") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewMode(stored);
    }
  }, []);

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  }

  const ordered = useMemo(
    () =>
      [...items].sort(
        (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
      ),
    [items]
  );

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = ordered.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesSearch =
      !normalizedSearch ||
      item.name.toLowerCase().includes(normalizedSearch) ||
      item.service.name.toLowerCase().includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });

  const hasActiveFilters = normalizedSearch !== "" || statusFilter !== "all";

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <section aria-labelledby="my-services-heading">
      <h2 id="my-services-heading" className="sr-only">
        Mes solutions
      </h2>

      {items.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une solution…"
              aria-label="Rechercher parmi mes solutions"
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as ClientServiceStatus | "all")
            }
            items={{ all: "Tous les statuts", ...STATUS_LABELS }}
          >
            <SelectTrigger className="w-44" aria-label="Filtrer par statut">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {STATUS_FILTER_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex shrink-0 items-center gap-0.5 rounded-4xl border border-border p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn(viewMode === "list" && "bg-muted text-foreground")}
              aria-pressed={viewMode === "list"}
              aria-label="Afficher en liste"
              onClick={() => handleViewModeChange("list")}
            >
              <LayoutList aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn(viewMode === "grid" && "bg-muted text-foreground")}
              aria-pressed={viewMode === "grid"}
              aria-label="Afficher en grille"
              onClick={() => handleViewModeChange("grid")}
            >
              <LayoutGrid aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Vous n'avez encore activé aucune solution"
          description="Choisissez une automatisation dans le catalogue pour démarrer."
          action={
            <Link href={CATALOGUE_PATH} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Voir le catalogue
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          tone="neutral"
          title="Aucune solution ne correspond à ces filtres"
          description="Essayez un autre nom ou un autre statut."
          action={
            hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Réinitialiser
              </Button>
            )
          }
        />
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {filtered.map((item) => (
            <MyServiceRow key={item.clientServiceId} item={item} />
          ))}
        </div>
      )}

    </section>
  );
}
