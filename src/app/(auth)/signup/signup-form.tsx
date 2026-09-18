"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, CircleAlert, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { authClient } from "@/lib/auth-client";
import { GoogleSignInButton } from "../google-signin-button";
import { cn } from "cn";

const AFTER_VERIFICATION_URL = "/dashboard";
const MIN_PASSWORD_LENGTH = 8;
const RESEND_DELAY_SECONDS = 30;

export function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const longEnough = password.length >= MIN_PASSWORD_LENGTH;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const company = String(formData.get("company") ?? "").trim();

    const { error } = await authClient.signUp.email({
      name: String(formData.get("name")),
      email,
      password: String(formData.get("password")),
      pendingOrganizationName: company || undefined,
      callbackURL: AFTER_VERIFICATION_URL,
    });

    setLoading(false);
    if (error) {
      setError(
        error.status === 422
          ? "Un compte existe déjà avec cet e-mail."
          : "La création du compte a échoué. Vérifiez vos informations puis réessayez."
      );
      return;
    }
    setSentTo(email);
    setCooldown(RESEND_DELAY_SECONDS);
  }

  async function handleResend() {
    if (!sentTo || cooldown > 0) return;
    const { error } = await authClient.sendVerificationEmail({
      email: sentTo,
      callbackURL: AFTER_VERIFICATION_URL,
    });
    if (error) {
      toast.error("L'envoi a échoué. Réessayez dans quelques minutes.");
      return;
    }
    setCooldown(RESEND_DELAY_SECONDS);
    toast.success("Nouveau lien envoyé.");
  }

  if (sentTo) {
    return (
      <div>
        <MailCheck className="size-6 text-primary" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Vérifiez votre boîte mail
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Nous avons envoyé un lien de confirmation à{" "}
          <span className="font-medium text-foreground">{sentTo}</span>.
          Cliquez dessus pour activer votre compte.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Rien reçu après quelques minutes ? Regardez dans les indésirables, ou
          demandez un nouveau lien.
        </p>

        <div className="mt-8">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Renvoyer le lien (${cooldown} s)` : "Renvoyer le lien"}
          </Button>
        </div>

        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:focus-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Revenir à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Créer un compte
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Activez vos premières automatisations en quelques minutes.
      </p>

      <div className="mt-8">
        <GoogleSignInButton />
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Marie Dupont"
            autoFocus
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">
            Entreprise <span className="text-muted-foreground">(optionnel)</span>
          </Label>
          <Input
            id="company"
            name="company"
            autoComplete="organization"
            placeholder="Dupont Coiffure"
            maxLength={80}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@entreprise.fr"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "signup-error" : undefined}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            describedBy="password-rule"
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

        {error && (
          <Alert variant="destructive" id="signup-error">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading ? "Création du compte…" : "Créer mon compte"}
        </Button>
      </form>

      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        En créant un compte, vous acceptez nos{" "}
        <Link href="/cgv" className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:focus-ring">
          conditions générales de vente
        </Link>{" "}
        et notre{" "}
        <Link
          href="/confidentialite"
          className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:focus-ring"
        >
          politique de confidentialité
        </Link>
        .
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link
          href="/login"
          className="rounded-sm text-foreground underline underline-offset-4 focus-visible:focus-ring"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
