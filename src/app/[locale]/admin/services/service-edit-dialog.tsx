"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_ORDER, type ServiceCategory } from "@/lib/catalog";
import { readUsageCap, type UsageUnit } from "@/lib/usage-cap";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { updateServiceAction } from "./actions";

export type EditableService = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ServiceCategory;
  monthlyPriceCents: number | null;
  includedUsageUnits: number | null;
  usageUnit: UsageUnit | null;
  overageUnitPriceCents: number | null;
  sortOrder: number;
  isActive: boolean;
};

const USAGE_UNITS = ["none", "MINUTE", "CALL", "MESSAGE"] as const;

function centsToEurosInput(cents: number | null): string {
  return cents === null ? "" : String(Math.round(cents) / 100);
}

export function ServiceEditDialog({
  service,
  open,
  onOpenChange,
}: {
  service: EditableService | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Admin.services.editDialog");
  const tCatalog = useTranslations("Catalog");
  const tCommon = useTranslations("Common");
  const tActions = useTranslations("Actions");
  const price = usePriceFormatter();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Erreur de saisie affichée sous la quantité incluse, qui reçoit le focus.
  const [includedError, setIncludedError] = useState<string | null>(null);

  const categoryLabels = Object.fromEntries(
    CATEGORY_ORDER.map((category) => [category, tCatalog(`categories.${category}`)])
  );
  const usageUnitLabels = Object.fromEntries(USAGE_UNITS.map((unit) => [unit, t(`units.${unit}`)]));
  const capPreview = service ? readUsageCap(service) : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service) return;

    const formData = new FormData(event.currentTarget);
    const monthlyPriceRaw = String(formData.get("monthlyPriceEuros") ?? "").trim();
    const usageUnitRaw = String(formData.get("usageUnit") ?? "none");
    const includedUnitsRaw = String(formData.get("includedUsageUnits") ?? "").trim();
    const overageRaw = String(formData.get("overageUnitEuros") ?? "").trim();
    const hasCap = usageUnitRaw === "CALL" || usageUnitRaw === "MINUTE" || usageUnitRaw === "MESSAGE";

    setIncludedError(null);
    if (hasCap && !includedUnitsRaw) {
      setIncludedError(tActions("adminServiceCapIncomplete"));
      document.getElementById("service-included-units")?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      unwrap(
        await updateServiceAction(service.id, {
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          category: String(formData.get("category") ?? service.category) as ServiceCategory,
          monthlyPriceEuros: monthlyPriceRaw ? Number(monthlyPriceRaw) : null,
          includedUsageUnits: hasCap && includedUnitsRaw ? Number(includedUnitsRaw) : null,
          usageUnit: hasCap ? (usageUnitRaw as UsageUnit) : null,
          overageUnitEuros: hasCap && overageRaw ? Number(overageRaw) : null,
          sortOrder: Number(formData.get("sortOrder") ?? service.sortOrder),
        })
      );
      toast.success(t("saved", { name: service.name }));
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, t("saveError")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setIncludedError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        {service && (
          <>
            <DialogHeader>
              <DialogTitle>{t("title", { name: service.name })}</DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </DialogHeader>

            <form
              key={service.id}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="service-name">{t("name")}</Label>
                <Input id="service-name" name="name" defaultValue={service.name} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-description">{t("descriptionLabel")}</Label>
                <Textarea
                  id="service-description"
                  name="description"
                  defaultValue={service.description}
                  rows={3}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="service-category">{t("category")}</Label>
                  <Select
                    name="category"
                    defaultValue={service.category}
                    items={categoryLabels}
                  >
                    <SelectTrigger id="service-category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_ORDER.map((category) => (
                        <SelectItem key={category} value={category}>
                          {categoryLabels[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-sort-order">{t("sortOrder")}</Label>
                  <Input
                    id="service-sort-order"
                    name="sortOrder"
                    type="number"
                    defaultValue={service.sortOrder}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-monthly-price">{t("monthlyPrice")}</Label>
                <Input
                  id="service-monthly-price"
                  name="monthlyPriceEuros"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={centsToEurosInput(service.monthlyPriceCents)}
                  aria-describedby="service-monthly-price-help"
                />
                <p id="service-monthly-price-help" className="text-xs text-muted-foreground">
                  {t("monthlyPriceHelp")}
                </p>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">
                  {t("usageCap")}{" "}
                  <span className="font-normal text-muted-foreground">{t("optional")}</span>
                </legend>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="service-usage-unit">{t("unit")}</Label>
                    <Select
                      name="usageUnit"
                      defaultValue={service.usageUnit ?? "none"}
                      items={usageUnitLabels}
                      onValueChange={() => setIncludedError(null)}
                    >
                      <SelectTrigger id="service-usage-unit" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USAGE_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {usageUnitLabels[unit]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-included-units">{t("included")}</Label>
                    <Input
                      id="service-included-units"
                      name="includedUsageUnits"
                      type="number"
                      min="1"
                      step="1"
                      placeholder={t("includedPlaceholder")}
                      defaultValue={service.includedUsageUnits ?? ""}
                      onChange={() => setIncludedError(null)}
                      aria-invalid={includedError ? true : undefined}
                      aria-describedby={includedError ? "service-included-units-error" : undefined}
                    />
                    {includedError && (
                      <p id="service-included-units-error" className="text-sm text-destructive">
                        {includedError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-overage-price">{t("overage")}</Label>
                    <Input
                      id="service-overage-price"
                      name="overageUnitEuros"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={t("overagePlaceholder")}
                      defaultValue={centsToEurosInput(service.overageUnitPriceCents)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {capPreview
                    ? t("capPreview", { cap: price.usageCap(capPreview) })
                    : t("noCapHint")}
                </p>
              </fieldset>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? tCommon("saving") : tCommon("save")}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
