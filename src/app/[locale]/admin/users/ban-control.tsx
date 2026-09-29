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
import { Textarea } from "@/components/ui/textarea";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { banUserAction, unbanUserAction } from "./actions";

export function BanControl({
  userId,
  banned,
  banReason,
  disabled,
}: {
  userId: string;
  banned: boolean;
  banReason: string | null;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");

  function handleUnban() {
    startTransition(async () => {
      try {
        unwrap(await unbanUserAction(userId));
        toast.success("Utilisateur débanni.");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  function handleBan() {
    startTransition(async () => {
      try {
        unwrap(await banUserAction(userId, reason));
        toast.success("Utilisateur banni.");
        setConfirmOpen(false);
        setReason("");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  if (banned) {
    return (
      <div className="space-y-1.5">
        {banReason && (
          <p className="text-sm text-muted-foreground">Motif : {banReason}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnban}
          disabled={disabled || isPending}
          aria-busy={isPending}
        >
          {isPending ? "Débannissement…" : "Débannir"}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={disabled}
      >
        Bannir
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Bannir cet utilisateur ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Toutes ses sessions actives seront révoquées et il ne pourra
              plus se connecter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motif (optionnel)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleBan}
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? "Bannissement…" : "Bannir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
