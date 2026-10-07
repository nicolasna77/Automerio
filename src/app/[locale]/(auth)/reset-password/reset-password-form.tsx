"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, CircleAlert, LockKeyhole } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { authClient } from "@/lib/auth-client";
import { cn } from "cn";

const MIN_PASSWORD_LENGTH = 8;

type PasswordField = "newPassword" | "confirmPassword";

export function ResetPasswordForm({
  token,
  invalidToken,
}: {
  token?: string;
  invalidToken: boolean;
}) {
  const t = useTranslations("Auth.resetPassword");
  const tShared = useTranslations("Auth.shared");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Erreur de saisie affichée sous le champ concerné, qui reçoit le focus.
  const [fieldError, setFieldError] = useState<{ field: PasswordField; message: string } | null>(null);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const longEnough = password.length >= MIN_PASSWORD_LENGTH;
  const mismatch = confirmation.length > 0 && confirmation !== password;
  const newPasswordError = fieldError?.field === "newPassword" ? fieldError.message : null;
  const confirmError =
    fieldError?.field === "confirmPassword" ? fieldError.message : mismatch ? t("mismatch") : null;

  function showFieldError(field: PasswordField, message: string) {
    setFieldError({ field, message });
    document.getElementById(field)?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setFieldError(null);

    if (!longEnough) {
      showFieldError("newPassword", t("tooShort", { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (password !== confirmation) {
      showFieldError("confirmPassword", t("mismatch"));
      return;
    }

    setLoading(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message ?? t("errors.generic"));
      return;
    }
    setDone(true);
  }

  if (!token || invalidToken) {
    return (
      <div>
        <CircleAlert className="size-6 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          {t("invalidTitle")}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {t("invalidDescription")}
        </p>
        <Button
          render={<Link href="/forgot-password" />}
          nativeButton={false}
          className="mt-8 w-full"
        >
          {t("requestNewLink")}
        </Button>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:focus-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {tShared("backToLogin")}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <LockKeyhole className="size-6 text-primary" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          {t("doneTitle")}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {t("doneDescription")}
        </p>
        <Button
          render={<Link href="/login" />}
          nativeButton={false}
          className="mt-8 w-full"
        >
          {tShared("signIn")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {t("subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">{t("newPasswordLabel")}</Label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (fieldError?.field === "newPassword") setFieldError(null);
            }}
            aria-invalid={newPasswordError ? true : undefined}
            describedBy={newPasswordError ? "password-rule newPassword-error" : "password-rule"}
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
            {tShared("minLength", { min: MIN_PASSWORD_LENGTH })}
          </p>
          {newPasswordError && (
            <p id="newPassword-error" className="text-sm text-destructive">
              {newPasswordError}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("confirmLabel")}</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => {
              setConfirmation(event.target.value);
              if (fieldError?.field === "confirmPassword") setFieldError(null);
            }}
            aria-invalid={confirmError ? true : undefined}
            describedBy={confirmError ? "confirmPassword-error" : undefined}
            required
          />
          {confirmError && (
            <p id="confirmPassword-error" className="text-sm text-destructive">
              {confirmError}
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          {loading ? t("submitting") : t("submit")}
        </Button>
      </form>
    </div>
  );
}
