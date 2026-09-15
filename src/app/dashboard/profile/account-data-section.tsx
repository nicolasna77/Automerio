"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ProfileSection } from "./profile-section";

const CONFIRMATION_WORD = "SUPPRIMER";

function describeDeletionError(error: { status: number; code?: string; message?: string }): string {
  if (error.code === "INVALID_PASSWORD" || error.status === 400) return "Mot de passe incorrect.";
  if (error.code === "SESSION_EXPIRED" || error.status === 401) {
    return "Par sécurité, reconnectez-vous puis recommencez.";
  }
  if (error.status === 403 && error.message) return error.message;
  return "La suppression a échoué. Réessayez, ou écrivez-nous depuis la rubrique Aide.";
}

export function AccountDataSection({ requiresPassword }: { requiresPassword: boolean }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  const canDelete =
    confirmation.trim().toUpperCase() === CONFIRMATION_WORD && (!requiresPassword || password);

  function reset() {
    setPassword("");
    setConfirmation("");
  }

  function handleDelete() {
    startTransition(async () => {
      const { error } = await authClient.deleteUser(requiresPassword ? { password } : {});
      if (error) {
        toast.error(describeDeletionError(error));
        return;
      }
      toast.success("Votre compte a été supprimé.");
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <ProfileSection
      title="Vos données"
      description="Téléchargez tout ce qu'Automerio conserve sur vous, ou supprimez définitivement votre compte."
    >
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href="/dashboard/profile/export" download />}
        >
          <Download aria-hidden="true" data-icon="inline-start" />
          Exporter mes données
        </Button>
        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          Supprimer mon compte
        </Button>
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) reset();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement votre compte ?</AlertDialogTitle>
            <AlertDialogDescription render={<div />}>
              <ul className="list-disc space-y-1 pl-5 text-left">
                <li>Vos abonnements en cours sont résiliés immédiatement.</li>
                <li>Les numéros de téléphone attribués à l&apos;IA sont libérés.</li>
                <li>Vos organisations, solutions et échanges sont effacés.</li>
                <li>Les factures restent conservées par Stripe, comme l&apos;exige la loi.</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-4">
            {requiresPassword && (
              <div className="space-y-2">
                <Label htmlFor="delete-password">Mot de passe</Label>
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                Tapez {CONFIRMATION_WORD} pour confirmer
              </Label>
              <Input
                id="delete-confirmation"
                autoComplete="off"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending || !canDelete}
              aria-busy={isPending}
            >
              {isPending ? "Suppression…" : "Supprimer mon compte"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProfileSection>
  );
}
