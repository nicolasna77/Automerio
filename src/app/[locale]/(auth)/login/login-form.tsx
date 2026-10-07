"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
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

type SignInErrorKey = "emailNotVerified" | "banned" | "invalidCredentials" | "tooManyAttempts" | "generic";

function signInErrorKey(error: { status: number; code?: string }): SignInErrorKey {
  if (error.code === "EMAIL_NOT_VERIFIED") return "emailNotVerified";
  if (error.code === "BANNED_USER") return "banned";
  if (error.status === 401) return "invalidCredentials";
  if (error.status === 429) return "tooManyAttempts";
  return "generic";
}

export function LoginForm({
  googleEnabled,
  next,
}: {
  googleEnabled: boolean;
  next: string | null;
}) {
  const t = useTranslations("Auth.login");
  const tShared = useTranslations("Auth.shared");
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
      setError(t(`errors.${signInErrorKey(error)}`));
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
        {t("title")}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {t("subtitle")}
      </p>

      {googleEnabled && (
        <div className="mt-8">
          <GoogleSignInButton next={next} />
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {tShared("or")}
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{tShared("emailLabel")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={tShared("emailPlaceholder")}
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{tShared("passwordLabel")}</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            describedBy={error ? "login-error" : undefined}
            required
          />
          {/* Après le champ dans le DOM : la tabulation passe du mot de passe au lien, pas l'inverse. */}
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="rounded-sm text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:focus-ring"
            >
              {t("forgotPassword")}
            </Link>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" id="login-error">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading ? t("submitting") : tShared("signIn")}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {t.rich("noAccount", {
          link: (chunks) => (
            <Link
              href={authPathWithNext("/signup", next)}
              className="rounded-sm text-foreground underline underline-offset-4 focus-visible:focus-ring"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
