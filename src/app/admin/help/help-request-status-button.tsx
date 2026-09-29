"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import type { HelpRequestStatus } from "@prisma/client";
import { setHelpRequestStatus } from "./actions";

export function HelpRequestStatusButton({
  helpRequestId,
  status,
}: {
  helpRequestId: string;
  status: HelpRequestStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const nextStatus: HelpRequestStatus =
    status === "OPEN" ? "RESOLVED" : "OPEN";

  function handleClick() {
    startTransition(async () => {
      try {
        unwrap(await setHelpRequestStatus(helpRequestId, nextStatus));
        toast.success(
          nextStatus === "RESOLVED"
            ? "Demande marquée comme traitée."
            : "Demande rouverte."
        );
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      aria-busy={isPending}
    >
      {isPending ? (
        <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />
      ) : null}
      {status === "OPEN" ? "Marquer comme traité" : "Rouvrir"}
    </Button>
  );
}
