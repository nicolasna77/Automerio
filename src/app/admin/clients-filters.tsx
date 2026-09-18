"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS, type ClientServiceStatus } from "@/lib/catalog";
import { useQueryParamFilters } from "@/hooks/use-query-param-filters";

const STATUS_OPTIONS: ClientServiceStatus[] = [
  "PENDING_PAYMENT",
  "CONFIGURING",
  "ACTIVE",
  "CANCELED",
];

const SCOPE_LABELS = {
  with: "Avec une solution",
  without: "Sans solution",
  all: "Tous les clients",
};

export function ClientsFilters() {
  const { searchParams, updateParams } = useQueryParamFilters();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("q");
          updateParams({ q: typeof value === "string" ? value.trim() : null });
        }}
        className="min-w-48 flex-1"
      >
        <label htmlFor="admin-client-search" className="sr-only">
          Rechercher un client
        </label>
        <Input
          id="admin-client-search"
          name="q"
          type="search"
          placeholder="Rechercher par nom, e-mail, entreprise…"
          defaultValue={searchParams.get("q") ?? ""}
        />
      </form>

      <Select
        value={searchParams.get("status") ?? "all"}
        items={{ all: "Tous les statuts", ...STATUS_LABELS }}
        onValueChange={(value) =>
          updateParams({ status: value === "all" ? null : value })
        }
      >
        <SelectTrigger className="w-56" aria-label="Filtrer par statut">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("scope") ?? "with"}
        items={SCOPE_LABELS}
        onValueChange={(value) => updateParams({ scope: value === "with" ? null : value })}
      >
        <SelectTrigger className="w-52" aria-label="Filtrer par solutions activées">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SCOPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Link
        href="/admin/export/clients"
        prefetch={false}
        className={buttonVariants({ variant: "ghost" })}
      >
        <Download data-icon="inline-start" />
        Exporter en CSV
      </Link>
    </div>
  );
}
