"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { CATEGORY_LABELS, CATEGORY_ORDER, type ServiceCategory } from "@/lib/catalog";
import { formatUsageCap, readUsageCap, type UsageUnit } from "@/lib/usage-cap";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { updateServiceAction } from "./actions";

export type EditableService = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ServiceCategory;
  setupFeeCents: number | null;
  monthlyPriceCents: number | null;
  includedUsageUnits: number | null;
  usageUnit: UsageUnit | null;
  overageUnitPriceCents: number | null;
  sortOrder: number;
  isActive: boolean;
};

const USAGE_UNIT_LABELS: Record<UsageUnit | "none", string> = {
  none: "Aucun plafond",
  CALL: "Appels",
  MINUTE: "Minutes",
};

function centsToEurosInput(cents: number | null): string {
  return cents === null ? "" : String(Math.round(cents) / 100);
}

/** Ce que le client lira sur le site et dans sa jauge, avec les valeurs en base. */
function usageCapPreview(service: EditableService): string | null {
  const cap = readUsageCap(service);
  return cap ? `Affiché au client : « ${formatUsageCap(cap)} »` : null;
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
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service) return;

    const formData = new FormData(event.currentTarget);
    const setupFeeRaw = String(formData.get("setupFeeEuros") ?? "").trim();
    const monthlyPriceRaw = String(formData.get("monthlyPriceEuros") ?? "").trim();
    const usageUnitRaw = String(formData.get("usageUnit") ?? "none");
    const includedUnitsRaw = String(formData.get("includedUsageUnits") ?? "").trim();
    const overageRaw = String(formData.get("overageUnitEuros") ?? "").trim();
    const hasCap = usageUnitRaw === "CALL" || usageUnitRaw === "MINUTE";

    setIsSubmitting(true);
    try {
      unwrap(
        await updateServiceAction(service.id, {
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          category: String(formData.get("category") ?? service.category) as ServiceCategory,
          setupFeeEuros: setupFeeRaw ? Number(setupFeeRaw) : null,
          monthlyPriceEuros: monthlyPriceRaw ? Number(monthlyPriceRaw) : null,
          includedUsageUnits: hasCap && includedUnitsRaw ? Number(includedUnitsRaw) : null,
          usageUnit: hasCap ? (usageUnitRaw as UsageUnit) : null,
          overageUnitEuros: hasCap && overageRaw ? Number(overageRaw) : null,
          sortOrder: Number(formData.get("sortOrder") ?? service.sortOrder),
        })
      );
      toast.success(`« ${service.name} » a été mise à jour.`);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Impossible de mettre à jour la solution."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {service && (
          <>
            <DialogHeader>
              <DialogTitle>
                Modifier « {service.name} »
              </DialogTitle>
              <DialogDescription>
                Ces changements s&apos;appliquent au site public et au
                tableau de bord client.
              </DialogDescription>
            </DialogHeader>

            <form
              key={service.id}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="service-name">Nom</Label>
                <Input id="service-name" name="name" defaultValue={service.name} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-description">Description</Label>
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
                  <Label htmlFor="service-category">Catégorie</Label>
                  <Select
                    name="category"
                    defaultValue={service.category}
                    items={CATEGORY_LABELS}
                  >
                    <SelectTrigger id="service-category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_ORDER.map((category) => (
                        <SelectItem key={category} value={category}>
                          {CATEGORY_LABELS[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-sort-order">Ordre d&apos;affichage</Label>
                  <Input
                    id="service-sort-order"
                    name="sortOrder"
                    type="number"
                    defaultValue={service.sortOrder}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="service-setup-fee">
                    Frais de mise en place (€)
                  </Label>
                  <Input
                    id="service-setup-fee"
                    name="setupFeeEuros"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Aucun"
                    defaultValue={centsToEurosInput(service.setupFeeCents)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-monthly-price">
                    Abonnement mensuel (€)
                  </Label>
                  <Input
                    id="service-monthly-price"
                    name="monthlyPriceEuros"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Aucun"
                    defaultValue={centsToEurosInput(service.monthlyPriceCents)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Laissez un champ de prix vide pour l&apos;omettre — au moins
                l&apos;un des deux est requis.
              </p>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">
                  Plafond d&apos;usage{" "}
                  <span className="font-normal text-muted-foreground">(optionnel)</span>
                </legend>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="service-usage-unit">Unité</Label>
                    <Select
                      name="usageUnit"
                      defaultValue={service.usageUnit ?? "none"}
                      items={USAGE_UNIT_LABELS}
                    >
                      <SelectTrigger id="service-usage-unit" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["none", "MINUTE", "CALL"] as const).map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {USAGE_UNIT_LABELS[unit]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-included-units">Quantité incluse</Label>
                    <Input
                      id="service-included-units"
                      name="includedUsageUnits"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Ex. 150"
                      defaultValue={service.includedUsageUnits ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-overage-price">Dépassement (€)</Label>
                    <Input
                      id="service-overage-price"
                      name="overageUnitEuros"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex. 0,30"
                      defaultValue={centsToEurosInput(service.overageUnitPriceCents)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {usageCapPreview(service) ??
                    "Laissez « Aucun plafond » pour une solution sans quota d’usage."}
                </p>
              </fieldset>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
