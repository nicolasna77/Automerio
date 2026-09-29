"use client";

import { useState, useTransition } from "react";
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
import { deactivatePromoCodeAction } from "./actions";

export function DeactivatePromoCodeButton({ id, code }: { id: string; code: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deactivatePromoCodeAction(id, code);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Code « ${code} » désactivé.`);
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant="ghost" size="xs" onClick={() => setOpen(true)}>
        Désactiver
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver « {code} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vos clients ne pourront plus le saisir. Ceux qui en ont déjà
              bénéficié gardent leur remise.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={pending}>
              {pending ? "Désactivation…" : "Désactiver"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
