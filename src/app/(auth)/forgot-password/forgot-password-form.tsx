"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const RESEND_DELAY_SECONDS = 30;

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestLink(email: string) {
    await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setCooldown(RESEND_DELAY_SECONDS);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const email = String(new FormData(event.currentTarget).get("email"));
    await requestLink(email);

    setSentTo(email);
    setLoading(false);
  }

  async function handleResend() {
    if (!sentTo || cooldown > 0) return;
    await requestLink(sentTo);
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
          Si un compte existe pour{" "}
          <span className="font-medium text-foreground">{sentTo}</span>, un lien
          pour choisir un nouveau mot de passe vient de lui être envoyé. Il
          expire dans une heure.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Rien reçu ? Regardez dans les indésirables avant de redemander un lien.
        </p>

        <div className="mt-8 space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Renvoyer le lien (${cooldown} s)` : "Renvoyer le lien"}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setSentTo(null);
              setCooldown(0);
            }}
          >
            Utiliser une autre adresse
          </Button>
        </div>

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

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Mot de passe oublié
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Indiquez votre e-mail : nous vous envoyons un lien pour en choisir un
        nouveau.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@entreprise.fr"
            autoFocus
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading ? "Envoi…" : "Envoyer le lien"}
        </Button>
      </form>

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
