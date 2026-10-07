"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryParamFilters } from "@/hooks/use-query-param-filters";

const STATUS_VALUES = ["open", "resolved", "all"] as const;

export function HelpRequestsFilters() {
  const t = useTranslations("Admin.help.filters");
  const STATUS_OPTIONS = STATUS_VALUES.map((value) => ({ value, label: t(value) }));
  const { searchParams, updateParams } = useQueryParamFilters();

  return (
    <div className="mb-4">
      <Select
        value={searchParams.get("status") ?? "open"}
        onValueChange={(value) =>
          updateParams({ status: value === "open" ? null : value })
        }
        items={STATUS_OPTIONS}
      >
        <SelectTrigger className="w-56" aria-label={t("statusFilter")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
