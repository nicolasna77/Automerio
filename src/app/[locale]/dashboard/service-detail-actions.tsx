"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
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
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import type { MyServiceDTO } from "@/lib/catalog";
import { cancelService } from "./actions";
import { ResumeCheckoutButton } from "./resume-checkout-button";

export function ServiceDetailActions({ item }: { item: MyServiceDTO }) {
  const router = useRouter();
  const [isCanceling, startCancelTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { status } = item;

  const canResume = status === "PENDING_PAYMENT" || status === "CANCELED";
  const canUnsubscribe = status === "ACTIVE" || status === "CONFIGURING";

  if (!canResume && !canUnsubscribe) return null;

  function handleUnsubscribe() {
    startCancelTransition(async () => {
      try {
        unwrap(await cancelService(item.clientServiceId));
        toast.success(`« ${item.name} » a été résiliée.`);
        setConfirmCancel(false);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canResume && (
          <ResumeCheckoutButton
            clientServiceId={item.clientServiceId}
            status={status}
          />
        )}
        {canUnsubscribe && (
          <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
            Se désabonner
          </Button>
        )}
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Résilier « {item.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;abonnement mensuel sera annulé immédiatement. Dans les 30
              jours suivant votre premier paiement, il vous est remboursé sur
              simple demande depuis la rubrique Aide.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleUnsubscribe}
              disabled={isCanceling}
              aria-busy={isCanceling}
            >
              {isCanceling ? "Résiliation…" : "Se désabonner"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
