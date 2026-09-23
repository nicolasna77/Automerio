"use client";

import { useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { openBillingPortal } from "../actions";

export function BillingPortalButton({
  organizationId,
  variant = "outline",
  size,
}: {
  organizationId: string;
  variant?: "outline" | "default";
  size?: "sm";
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const { url } = unwrap(await openBillingPortal(organizationId));
        window.location.href = url;
      } catch (err) {
        toast.error(getErrorMessage(err, "Le portail de paiement est indisponible. Réessayez."));
      }
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isPending}
      aria-busy={isPending}
    >
      {isPending ? (
        <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />
      ) : (
        <CreditCard aria-hidden="true" data-icon="inline-start" />
      )}
      Gérer le moyen de paiement
    </Button>
  );
}
