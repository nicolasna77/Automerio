"use client";

import { useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Settings } from "lucide-react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { cancelService } from "../actions";
import { ResumeCheckoutButton } from "../resume-checkout-button";
import type { MySubscription } from "@/lib/subscriptions";
import { BILLING_SECTION_ID } from "../billing-section";

export function SubscriptionActions({
  subscription,
  running,
}: {
  subscription: MySubscription;
  // Calculé côté serveur : @/lib/subscriptions lit la base, on ne l'importe
  // pas dans un composant client.
  running: boolean;
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
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(true)}>
        Se désabonner
      </Button>
      {/* L'onglet Abonnement des réglages n'existe que si l'abonnement court. */}
      {running && (
        <Link
          href={`/dashboard/services/${clientServiceId}/configuration#${BILLING_SECTION_ID}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Settings data-icon="inline-start" aria-hidden="true" />
          Réglages
        </Link>
      )}

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
    </div>
  );
}
