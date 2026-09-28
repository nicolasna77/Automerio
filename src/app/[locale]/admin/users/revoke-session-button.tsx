"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { revokeUserSessionAction } from "./actions";

export function RevokeSessionButton({
  userId,
  sessionToken,
  expired = false,
}: {
  userId: string;
  sessionToken: string;
  expired?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (expired) {
    return (
      <span className="text-xs text-muted-foreground">Déjà expirée</span>
    );
  }

  function handleRevoke() {
    startTransition(async () => {
      try {
        unwrap(await revokeUserSessionAction(userId, sessionToken));
        toast.success("Session révoquée.");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={handleRevoke}
      disabled={isPending}
      aria-busy={isPending}
    >
      {isPending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        "Révoquer"
      )}
    </Button>
  );
}
