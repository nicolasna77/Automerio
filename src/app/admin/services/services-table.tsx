"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
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
import { CATEGORY_LABELS, formatPrice } from "@/lib/catalog";
import { unwrap } from "@/lib/action-result";
import { cn, getErrorMessage } from "@/lib/utils";
import { setServiceActiveAction } from "./actions";
import { ServiceEditDialog, type EditableService } from "./service-edit-dialog";

export function ServicesTable({ services }: { services: EditableService[] }) {
  const [editing, setEditing] = useState<EditableService | null>(null);

  return (
    <>
      <Card>
        <CardContent>
          <Table>
            <TableCaption className="sr-only">Catalogue des solutions</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Solution</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Plafond d&apos;usage</TableHead>
                <TableHead className="text-right">Ordre</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow
                  key={service.id}
                  className={cn(!service.isActive && "opacity-60")}
                >
                  <TableCell className="font-medium text-foreground">
                    {service.name}
                    <p className="text-xs font-normal text-muted-foreground">
                      {service.slug}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {CATEGORY_LABELS[service.category]}
                  </TableCell>
                  <TableCell className="tabular-nums text-foreground">
                    {formatPrice(service.setupFeeCents, service.monthlyPriceCents)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {service.usageCapLabel ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {service.sortOrder}
                  </TableCell>
                  <TableCell>
                    <ServiceActiveToggle service={service} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Modifier ${service.name}`}
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
        toast.success(
          checked
            ? `« ${service.name} » est de nouveau proposée.`
            : `« ${service.name} » est désactivée temporairement.`
        );
      } catch (err) {
        setIsActive(previous);
        toast.error(getErrorMessage(err, "Impossible de changer le statut."));
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
          aria-label={`${isActive ? "Désactiver" : "Réactiver"} ${service.name}`}
        />
        <span className="text-xs text-muted-foreground">
          {isActive ? "Active" : "Désactivée"}
        </span>
      </label>

      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer « {service.name} » du catalogue ?</AlertDialogTitle>
            <AlertDialogDescription>
              Elle ne sera plus proposée sur le site ni dans le catalogue des clients. Les clients
              qui l&apos;ont déjà activée la gardent. Vous pourrez la réactiver à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => applyChange(false)}>
              Retirer du catalogue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
