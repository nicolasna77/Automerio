"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { setCallHandledAction } from "./call-actions";

export function MarkHandledButton({
  clientServiceId,
  callId,
  label,
}: {
  clientServiceId: string;
  callId: string;
  /** Ce que l'appel concerne, pour qu'un lecteur d'ecran sache lequel il marque. */
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      aria-label={`Marquer comme traité : ${label}`}
      onClick={() =>
        startTransition(async () => {
          try {
            unwrap(await setCallHandledAction(clientServiceId, callId, true));
            router.refresh();
          } catch (err) {
            toast.error(getErrorMessage(err, "L'appel n'a pas pu être mis à jour."));
          }
        })
      }
    >
      <Check aria-hidden="true" data-icon="inline-start" />
      Traité
    </Button>
  );
}
