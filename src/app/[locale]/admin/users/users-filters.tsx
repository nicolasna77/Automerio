"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryParamFilters } from "@/hooks/use-query-param-filters";

const ROLE_FILTERS = ["all", "ADMIN", "CLIENT"] as const;

export function UsersFilters() {
  const t = useTranslations("Admin.users.filters");
  const { searchParams, updateParams } = useQueryParamFilters();
  const roleFilterLabels = Object.fromEntries(ROLE_FILTERS.map((role) => [role, t(`roles.${role}`)]));

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
        <label htmlFor="admin-user-search" className="sr-only">
          {t("searchLabel")}
        </label>
        <Input
          id="admin-user-search"
          name="q"
          type="search"
          placeholder={t("searchPlaceholder")}
          defaultValue={searchParams.get("q") ?? ""}
        />
      </form>

      <Select
        value={searchParams.get("role") ?? "all"}
        onValueChange={(value) =>
          updateParams({ role: value === "all" ? null : value })
        }
        items={roleFilterLabels}
      >
        <SelectTrigger className="w-48" aria-label={t("roleFilter")}>
          <SelectValue placeholder={t("roles.all")} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(roleFilterLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
