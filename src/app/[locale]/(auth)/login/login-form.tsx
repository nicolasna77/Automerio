"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { authClient } from "@/lib/auth-client";
import { GoogleSignInButton } from "../google-signin-button";
import { describedBy, EMAIL_PATTERN, FieldError } from "../field-error";
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

type FieldErrors = { email?: string; password?: string };

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
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ key: SignInErrorKey; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    // Champs vides ou e-mail mal formé : message sous le champ, focus dessus,
    // rien n'est envoyé.
    const found: FieldErrors = {};
    if (!email) found.email = tShared("errors.emailRequired");
    else if (!EMAIL_PATTERN.test(email)) found.email = tShared("errors.emailInvalid");
    if (!password) found.password = tShared("errors.passwordRequired");
    setFieldErrors(found);
    if (found.email) return emailRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();

    setLoading(true);
    const { data, error } = await authClient.signIn.email({ email, password });

    if (error) {
      const key = signInErrorKey(error);
      setError({ key, message: t(`errors.${key}`) });
      setLoading(false);
      // Identifiants faux : les champs restent remplis, le mot de passe est
      // sélectionné pour être retapé.
      if (key === "invalidCredentials") passwordRef.current?.select();
      return;
    }

    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      router.push(next ? `/login/verification?next=${encodeURIComponent(next)}` : "/login/verification");
      return;
    }

    await redirectAfterSignIn(router, next);
  }

  // Seuls des identifiants refusés mettent les deux champs en erreur ; un
  // compte suspendu ou trop d'essais ne dépendent pas de la saisie.
  const credentialsRejected = error?.key === "invalidCredentials";

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
          <div aria-hidden="true" className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {tShared("or")}
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className={googleEnabled ? "space-y-4" : "mt-8 space-y-4"}>
        <div className="space-y-2">
          <Label htmlFor="email">{tShared("emailLabel")}</Label>
          <Input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            placeholder={tShared("emailPlaceholder")}
            autoFocus
            onChange={() => fieldErrors.email && setFieldErrors((f) => ({ ...f, email: undefined }))}
            aria-invalid={fieldErrors.email || credentialsRejected ? true : undefined}
            aria-describedby={describedBy(fieldErrors.email && "email-error", credentialsRejected && "login-error")}
            required
          />
          <FieldError id="email-error" message={fieldErrors.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{tShared("passwordLabel")}</Label>
          <PasswordInput
            ref={passwordRef}
            id="password"
            name="password"
            autoComplete="current-password"
            onChange={() => fieldErrors.password && setFieldErrors((f) => ({ ...f, password: undefined }))}
            aria-invalid={fieldErrors.password || credentialsRejected ? true : undefined}
            describedBy={describedBy(fieldErrors.password && "password-error", credentialsRejected && "login-error")}
            required
          />
          <FieldError id="password-error" message={fieldErrors.password} />
          {/* Après le champ dans le DOM : la tabulation passe du mot de passe au lien, pas l'inverse. */}
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="-my-1 inline-flex min-h-6 items-center rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:focus-ring"
            >
              {t("forgotPassword")}
            </Link>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" id="login-error">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          {loading ? t("submitting") : tShared("signIn")}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {t.rich("noAccount", {
          link: (chunks) => (
            <Link
              href={authPathWithNext("/signup", next)}
              className="rounded-sm font-medium text-foreground underline underline-offset-4 focus-visible:focus-ring"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
