"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { cancelService } from "../actions";
import { ResumeCheckoutButton } from "../resume-checkout-button";
import type { MySubscription } from "@/lib/subscriptions";

export function SubscriptionActions({
  subscription,
}: {
  subscription: MySubscription;
}) {
  const router = useRouter();
  const [isCanceling, startCancelTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { status, name, clientServiceId } = subscription;

  function handleUnsubscribe() {
    startCancelTransition(async () => {
      try {
        unwrap(await cancelService(clientServiceId));
        toast.success(`« ${name} » a été résiliée.`);
        setConfirmCancel(false);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  if (status === "PENDING_PAYMENT" || status === "CANCELED") {
    return <ResumeCheckoutButton clientServiceId={clientServiceId} status={status} />;
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(true)}>
        Se désabonner
      </Button>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Résilier « {name} » ?</AlertDialogTitle>
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
