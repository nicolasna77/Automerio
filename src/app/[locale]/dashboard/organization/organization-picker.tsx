"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrganizationCreateDialog } from "@/components/organization-create-dialog";
import { useSwitchOrganization } from "@/hooks/use-switch-organization";
import type { OrganizationSummary } from "@/lib/organization";

// En tête de la page Organisation : l'entreprise affichée, que l'on peut
// changer ici sans passer par la barre latérale.
export function OrganizationPicker({
  active,
  organizations,
}: {
  active: OrganizationSummary;
  organizations: OrganizationSummary[];
}) {
  const t = useTranslations("Dashboard.organization.picker");
  const { switchTo, switchingId } = useSwitchOrganization(active.id);
  const [createOpen, setCreateOpen] = useState(false);
  const items = organizations.map((organization) => ({ value: organization.id, label: organization.name }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
      {organizations.length > 1 ? (
        <Select
          value={active.id}
          items={items}
          disabled={switchingId !== null}
          onValueChange={(next) => {
            if (next) void switchTo(next);
          }}
        >
          <SelectTrigger aria-label={t("label")} className="h-9 min-w-56 font-medium text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="font-medium text-foreground">{active.name}</span>
      )}
      <Button type="button" variant="ghost" size="sm" onClick={() => setCreateOpen(true)}>
        <Plus aria-hidden="true" data-icon="inline-start" />
        {t("create")}
      </Button>
      <OrganizationCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
