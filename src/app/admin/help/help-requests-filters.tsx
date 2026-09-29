"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryParamFilters } from "@/hooks/use-query-param-filters";

const STATUS_OPTIONS = [
  { value: "open", label: "En attente" },
  { value: "resolved", label: "Traitées" },
  { value: "all", label: "Toutes" },
];

export function HelpRequestsFilters() {
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
        <SelectTrigger className="w-56" aria-label="Filtrer par statut">
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
