"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, CircleAlert, MailCheck } from "lucide-react";
import { toast } from "@/lib/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { describedBy, EMAIL_PATTERN, FieldError } from "../field-error";

const RESEND_DELAY_SECONDS = 30;

export function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgotPassword");
  const tShared = useTranslations("Auth.shared");
  const tCommon = useTranslations("Common");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // better-auth répond de la même façon qu'un compte existe ou non : une
  // erreur ici est un vrai échec (réseau, limite d'envoi), pas une adresse
  // inconnue. Renvoie le message à afficher, ou null si le lien est parti.
  async function requestLink(email: string): Promise<string | null> {
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    if (error) return error.status === 429 ? t("errors.tooMany") : t("errors.generic");
    setCooldown(RESEND_DELAY_SECONDS);
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    const invalid = !email
      ? tShared("errors.emailRequired")
      : !EMAIL_PATTERN.test(email)
        ? tShared("errors.emailInvalid")
        : null;
    setEmailError(invalid);
    if (invalid) return emailRef.current?.focus();

    setLoading(true);
    const failure = await requestLink(email);
    setLoading(false);
    if (failure) {
      setError(failure);
      return;
    }
    setSentTo(email);
  }

  async function handleResend() {
    if (!sentTo || cooldown > 0) return;
    const failure = await requestLink(sentTo);
    if (failure) toast.error(failure);
    else toast.success(tShared("newLinkSent"));
  }

  if (sentTo) {
    return (
      <div role="status">
        <MailCheck className="size-6 text-primary" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          {tShared("checkInbox")}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {t.rich("sentMessage", {
            email: sentTo,
            strong: (chunks) => <span className="font-medium text-foreground [overflow-wrap:anywhere]">{chunks}</span>,
          })}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("notReceived")}
        </p>

        <div className="mt-8 space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={cooldown > 0}
          >
            {cooldown > 0
              ? tShared("resendLinkCooldown", { seconds: cooldown })
              : tShared("resendLink")}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setSentTo(null);
              setCooldown(0);
            }}
          >
            {t("useAnotherAddress")}
          </Button>
        </div>

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

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {t("subtitle")}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{tShared("emailLabel")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            ref={emailRef}
            inputMode="email"
            spellCheck={false}
            placeholder={tShared("emailPlaceholder")}
            autoFocus
            onChange={() => emailError && setEmailError(null)}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={describedBy(emailError && "email-error")}
            required
          />
          <FieldError id="email-error" message={emailError} />
        </div>
        {error && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" className="w-full" loading={loading}>
          {loading ? tCommon("sending") : t("submit")}
        </Button>
      </form>

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
