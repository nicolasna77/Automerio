"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, CircleAlert, LockKeyhole } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { authClient } from "@/lib/auth-client";
import { cn } from "cn";

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordForm({
  token,
  invalidToken,
}: {
  token?: string;
  invalidToken: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const longEnough = password.length >= MIN_PASSWORD_LENGTH;
  const mismatch = confirmation.length > 0 && confirmation !== password;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError(null);

    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (!longEnough) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }

    setLoading(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message ?? "La mise à jour a échoué. Redemandez un lien.");
      return;
    }
    setDone(true);
  }

  if (!token || invalidToken) {
    return (
      <div>
        <CircleAlert className="size-6 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Lien invalide ou expiré
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Les liens de réinitialisation ne servent qu&apos;une fois et expirent
          au bout d&apos;une heure. Demandez-en un nouveau pour continuer.
        </p>
        <Button
          render={<Link href="/forgot-password" />}
          nativeButton={false}
          className="mt-8 w-full"
        >
          Demander un nouveau lien
        </Button>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:focus-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Retour à la connexion
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <LockKeyhole className="size-6 text-primary" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Mot de passe mis à jour
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Connectez-vous avec votre nouveau mot de passe. Si vous n&apos;êtes pas
          à l&apos;origine de ce changement, contactez l&apos;équipe Automerio.
        </p>
        <Button
          render={<Link href="/login" />}
          nativeButton={false}
          className="mt-8 w-full"
        >
          Se connecter
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Choisir un nouveau mot de passe
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Il remplacera l&apos;ancien dès la validation.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">Nouveau mot de passe</Label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            describedBy="password-rule"
            autoFocus
            required
          />
          <p
            id="password-rule"
            className={cn(
              "flex items-center gap-1.5 text-xs",
              longEnough ? "text-primary" : "text-muted-foreground"
            )}
          >
            {longEnough && <Check className="size-3.5" aria-hidden="true" />}
            {MIN_PASSWORD_LENGTH} caractères minimum.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            aria-invalid={mismatch || undefined}
            describedBy={mismatch ? "confirm-mismatch" : undefined}
            required
          />
          {mismatch && (
            <p id="confirm-mismatch" className="text-xs text-destructive">
              Les deux mots de passe ne correspondent pas.
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading ? "Mise à jour…" : "Mettre à jour le mot de passe"}
        </Button>
      </form>
    </div>
  );
}
