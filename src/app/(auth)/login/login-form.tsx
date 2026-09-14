"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { GoogleSignInButton } from "../google-signin-button";
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

export function LoginForm() {
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
      router.push("/login/verification");
      return;
    }

    await redirectAfterSignIn(router);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>
          Accédez à votre tableau de bord Automerio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleSignInButton />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>
      </CardContent>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="vous@entreprise.fr"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link href="/signup" className="text-foreground underline underline-offset-4">
              Créer mon compte
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
