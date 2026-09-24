"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { authClient } from "@/lib/auth-client";
import { GoogleSignInButton } from "../google-signin-button";
import { authPathWithNext } from "@/lib/safe-redirect";
import { redirectAfterSignIn } from "./redirect-after-sign-in";

function describeSignInError(error: { status: number; code?: string }): string {
  if (error.code === "EMAIL_NOT_VERIFIED") {
    return "Confirmez d'abord votre adresse e-mail : nous venons de vous renvoyer le lien.";
  }
  if (error.code === "BANNED_USER") {
    return "Ce compte a été suspendu. Contactez l'équipe Automerio.";
  }
  if (error.status === 401) return "E-mail ou mot de passe incorrect.";
  if (error.status === 429) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return "La connexion a échoué. Réessayez dans un instant.";
}

export function LoginForm({
  googleEnabled,
  next,
}: {
  googleEnabled: boolean;
  next: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const { data, error } = await authClient.signIn.email({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });

    if (error) {
      setError(describeSignInError(error));
      setLoading(false);
      return;
    }

    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      router.push(next ? `/login/verification?next=${encodeURIComponent(next)}` : "/login/verification");
      return;
    }

    await redirectAfterSignIn(router, next);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Connexion
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Retrouvez vos automatisations et leur suivi.
      </p>

      {googleEnabled && (
        <div className="mt-8">
          <GoogleSignInButton next={next} />
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@entreprise.fr"
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Mot de passe</Label>
            <Link
              href="/forgot-password"
              className="rounded-sm text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:focus-ring"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            describedBy={error ? "login-error" : undefined}
            required
          />
        </div>

        {error && (
          <Alert variant="destructive" id="login-error">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link
          href={authPathWithNext("/signup", next)}
          className="rounded-sm text-foreground underline underline-offset-4 focus-visible:focus-ring"
        >
          Créer mon compte
        </Link>
      </p>
    </div>
  );
}
