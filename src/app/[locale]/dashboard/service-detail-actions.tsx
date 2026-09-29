"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Ellipsis, XCircle } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import type { MyServiceDTO } from "@/lib/catalog";
import { cancelService } from "./actions";
import { ResumeCheckoutButton } from "./resume-checkout-button";
import { ServiceSettingsButton } from "./service-settings-button";

// Actions secondaires d'une solution, rangées dans un menu « Plus
// d'actions » : la résiliation ne doit pas peser autant que les réglages ou
// l'action principale de la page.
export function ServiceActionsMenu({
  item,
  className,
}: {
  item: MyServiceDTO;
  className?: string;
}) {
  const router = useRouter();
  const [isCanceling, startCancelTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const canUnsubscribe = item.status === "ACTIVE" || item.status === "CONFIGURING";
  if (!canUnsubscribe) return null;

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
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className={className}
              aria-label={`Plus d'actions pour « ${item.name} »`}
            />
          }
        >
          <Ellipsis aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-56">
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmCancel(true)}>
            <XCircle aria-hidden="true" />
            Se désabonner
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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

export function ServiceDetailActions({ item }: { item: MyServiceDTO }) {
  const canResume = item.status === "PENDING_PAYMENT" || item.status === "CANCELED";

  return (
    <div className="flex items-center gap-2">
      {canResume && (
        <ResumeCheckoutButton
          clientServiceId={item.clientServiceId}
          status={item.status as "PENDING_PAYMENT" | "CANCELED"}
        />
      )}
      <ServiceSettingsButton item={item} labeled />
      <ServiceActionsMenu item={item} />
    </div>
  );
}
