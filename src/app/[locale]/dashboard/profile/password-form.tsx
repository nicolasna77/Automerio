"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ProfileSection } from "./profile-section";

export function PasswordForm() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    startTransition(async () => {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        toast.error(error.message ?? "Une erreur est survenue.");
        return;
      }
      toast.success("Mot de passe mis à jour.");
      reset();
      setOpen(false);
    });
  }

  return (
    <ProfileSection
      title="Mot de passe"
      description="Le changer déconnecte vos autres appareils."
      action={
        !open && (
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            Changer le mot de passe
          </Button>
        )
      }
    >
      {open && (
        <form onSubmit={handleSubmit} className="grid gap-4 sm:max-w-md">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Mot de passe actuel</Label>
            <Input
              id="currentPassword"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <Input
              id="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? "Mise à jour…" : "Mettre à jour"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      )}
    </ProfileSection>
  );
}
