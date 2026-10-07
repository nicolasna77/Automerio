"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
import type { ClientServiceStatus } from "@/lib/catalog";
import { useLabels } from "@/hooks/use-labels";
import { useQueryParamFilters } from "@/hooks/use-query-param-filters";

const STATUS_OPTIONS: ClientServiceStatus[] = [
  "PENDING_PAYMENT",
  "CONFIGURING",
  "ACTIVE",
  "CANCELED",
];

const SCOPES = ["with", "without", "all"] as const;

export function ClientsFilters() {
  const t = useTranslations("Admin.clients.filters");
  const labels = useLabels();
  const { searchParams, updateParams } = useQueryParamFilters();
  const statusLabels = Object.fromEntries(STATUS_OPTIONS.map((status) => [status, labels.status(status)]));
  const scopeLabels = Object.fromEntries(SCOPES.map((scope) => [scope, t(`scope.${scope}`)]));

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
          {t("searchLabel")}
        </label>
        <Input
          id="admin-client-search"
          name="q"
          type="search"
          placeholder={t("searchPlaceholder")}
          defaultValue={searchParams.get("q") ?? ""}
        />
      </form>

      <Select
        value={searchParams.get("status") ?? "all"}
        items={{ all: t("allStatuses"), ...statusLabels }}
        onValueChange={(value) =>
          updateParams({ status: value === "all" ? null : value })
        }
      >
        <SelectTrigger className="w-56" aria-label={t("statusFilter")}>
          <SelectValue placeholder={t("allStatuses")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allStatuses")}</SelectItem>
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {statusLabels[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("scope") ?? "with"}
        items={scopeLabels}
        onValueChange={(value) => updateParams({ scope: value === "with" ? null : value })}
      >
        <SelectTrigger className="w-52" aria-label={t("scopeFilter")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(scopeLabels).map(([value, label]) => (
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
        {t("export")}
      </Link>
    </div>
  );
}
