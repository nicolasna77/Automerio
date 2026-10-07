"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { centsExcludingVat } from "@/lib/vat";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { readUsageCap } from "@/lib/usage-cap";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import { setServiceActiveAction } from "./actions";
import { ServiceEditDialog, type EditableService } from "./service-edit-dialog";

export function ServicesTable({ services }: { services: EditableService[] }) {
  const t = useTranslations("Admin.services");
  const tCatalog = useTranslations("Catalog");
  const price = usePriceFormatter();
  const [editing, setEditing] = useState<EditableService | null>(null);

  function usageCapLabel(service: EditableService): string {
    const cap = readUsageCap(service);
    return cap ? price.usageCap(cap) : "—";
  }

  return (
    <>
      <Card>
        <CardContent>
          <Table>
            <TableCaption className="sr-only">{t("caption")}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.solution")}</TableHead>
                <TableHead>{t("columns.category")}</TableHead>
                <TableHead>{t("columns.price")}</TableHead>
                <TableHead>{t("columns.usageCap")}</TableHead>
                <TableHead className="hidden text-right xl:table-cell">
                  {t("columns.order")}
                </TableHead>
                <TableHead>{t("columns.active")}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="min-w-40 font-medium whitespace-normal text-foreground">
                    {service.name}
                    <p className="text-xs font-normal break-all text-muted-foreground">
                      {service.slug}
                    </p>
                  </TableCell>
                  <TableCell className="min-w-32 whitespace-normal text-muted-foreground">
                    {tCatalog(`categories.${service.category}`)}
                  </TableCell>
                  <TableCell className="tabular-nums text-foreground">
                    {service.monthlyPriceCents === null ? (
                      price.perMonth(null)
                    ) : (
                      <>
                        {price.perMonthWithVat(service.monthlyPriceCents)}
                        <span className="block text-xs text-muted-foreground">
                          {t("excludingVat", {
                            amount: price.perMonth(centsExcludingVat(service.monthlyPriceCents)),
                          })}
                        </span>
                      </>
                    )}
                  </TableCell>
                  <TableCell className="min-w-40 text-sm whitespace-normal text-muted-foreground">
                    {usageCapLabel(service)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground xl:table-cell">
                    {service.sortOrder}
                  </TableCell>
                  <TableCell>
                    <ServiceActiveToggle service={service} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("edit", { name: service.name })}
                      onClick={() => setEditing(service)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ServiceEditDialog
        service={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </>
  );
}

function ServiceActiveToggle({ service }: { service: EditableService }) {
  const t = useTranslations("Admin.services");
  const tCommon = useTranslations("Common");
  const [isActive, setIsActive] = useState(service.isActive);
  const [isPending, startTransition] = useTransition();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  function handleChange(checked: boolean) {
    if (checked) applyChange(true);
    else setConfirmDeactivate(true);
  }

  function applyChange(checked: boolean) {
    setConfirmDeactivate(false);
    const previous = isActive;
    setIsActive(checked);
    startTransition(async () => {
      try {
        unwrap(await setServiceActiveAction(service.id, checked));
        toast.success(t(checked ? "reactivated" : "deactivated", { name: service.name }));
      } catch (err) {
        setIsActive(previous);
        toast.error(getErrorMessage(err, t("toggleError")));
      }
    });
  }

  return (
    <>
      <label className="flex items-center gap-2">
        <Switch
          checked={isActive}
          onCheckedChange={handleChange}
          disabled={isPending}
          aria-label={t(isActive ? "deactivateNamed" : "reactivateNamed", { name: service.name })}
        />
        <span className="text-xs text-muted-foreground">
          {isActive ? t("statusActive") : t("statusInactive")}
        </span>
      </label>

      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle", { name: service.name })}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => applyChange(false)}>
              {t("confirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
