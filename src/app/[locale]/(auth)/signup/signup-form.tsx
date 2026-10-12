"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, CircleAlert, MailCheck } from "lucide-react";
import { toast } from "@/lib/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { authClient } from "@/lib/auth-client";
import { authPathWithNext } from "@/lib/safe-redirect";
import { GoogleSignInButton } from "../google-signin-button";
import { describedBy, EMAIL_PATTERN, FieldError } from "../field-error";
import { cn } from "cn";

const AFTER_VERIFICATION_URL = "/dashboard";
const MIN_PASSWORD_LENGTH = 8;
const RESEND_DELAY_SECONDS = 30;

type Field = "name" | "email" | "password";
type FieldErrors = Partial<Record<Field, string>>;

export function SignupForm({
  googleEnabled,
  next,
}: {
  googleEnabled: boolean;
  next: string | null;
}) {
  const t = useTranslations("Auth.signup");
  const tShared = useTranslations("Auth.shared");
  const afterVerificationUrl = next ?? AFTER_VERIFICATION_URL;
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const longEnough = password.length >= MIN_PASSWORD_LENGTH;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function clearFieldError(field: Field) {
    if (fieldErrors[field]) setFieldErrors((f) => ({ ...f, [field]: undefined }));
  }

  // Erreur sous le champ concerné ; le premier champ à corriger reçoit le focus.
  function showFieldErrors(found: FieldErrors): boolean {
    setFieldErrors(found);
    if (found.name) nameRef.current?.focus();
    else if (found.email) emailRef.current?.focus();
    else if (found.password) passwordRef.current?.focus();
    return Boolean(found.name || found.email || found.password);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();

    const found: FieldErrors = {};
    if (!name) found.name = t("errors.nameRequired");
    if (!email) found.email = tShared("errors.emailRequired");
    else if (!EMAIL_PATTERN.test(email)) found.email = tShared("errors.emailInvalid");
    if (!longEnough) found.password = tShared("errors.passwordTooShort", { min: MIN_PASSWORD_LENGTH });
    if (showFieldErrors(found)) return;

    setLoading(true);
    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      pendingOrganizationName: company || undefined,
      callbackURL: afterVerificationUrl,
    });

    setLoading(false);
    if (error) {
      // E-mail déjà pris : sous le champ e-mail (02-app-flow.md).
      if (error.status === 422) showFieldErrors({ email: t("errors.emailTaken") });
      else setError(t("errors.generic"));
      return;
    }
    setSentTo(email);
    setCooldown(RESEND_DELAY_SECONDS);
  }

  async function handleResend() {
    if (!sentTo || cooldown > 0) return;
    const { error } = await authClient.sendVerificationEmail({
      email: sentTo,
      callbackURL: afterVerificationUrl,
    });
    if (error) {
      toast.error(t("errors.resendFailed"));
      return;
    }
    setCooldown(RESEND_DELAY_SECONDS);
    toast.success(tShared("newLinkSent"));
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

        <div className="mt-8">
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
        </div>

        <Link
          href={authPathWithNext("/login", next)}
          className="mt-6 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:focus-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {tShared("returnToLogin")}
        </Link>
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
          <Label htmlFor="name">{t("nameLabel")}</Label>
          <Input
            ref={nameRef}
            id="name"
            name="name"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            autoFocus
            onChange={() => clearFieldError("name")}
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={describedBy(fieldErrors.name && "name-error")}
            required
          />
          <FieldError id="name-error" message={fieldErrors.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">
            {t("companyLabel")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
          </Label>
          <Input
            id="company"
            name="company"
            autoComplete="organization"
            placeholder={t("companyPlaceholder")}
            maxLength={80}
          />
        </div>
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
            onChange={() => clearFieldError("email")}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={describedBy(fieldErrors.email && "email-error")}
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
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError("password");
            }}
            aria-invalid={fieldErrors.password ? true : undefined}
            describedBy={describedBy("password-rule", fieldErrors.password && "password-error")}
            required
          />
          <p
            id="password-rule"
            className={cn(
              "flex items-center gap-1.5 text-[13px]",
              longEnough ? "text-primary" : "text-muted-foreground"
            )}
          >
            {longEnough && <Check className="size-3.5" aria-hidden="true" />}
            {tShared("minLength", { min: MIN_PASSWORD_LENGTH })}
          </p>
          <FieldError id="password-error" message={fieldErrors.password} />
        </div>

        {error && (
          <Alert variant="destructive" id="signup-error">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          {loading ? t("submitting") : tShared("createAccount")}
        </Button>
      </form>

      <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">
        {t.rich("terms", {
          terms: (chunks) => (
            <Link href="/terms" className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:focus-ring">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:focus-ring">
              {chunks}
            </Link>
          ),
        })}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        {t.rich("hasAccount", {
          link: (chunks) => (
            <Link
              href={authPathWithNext("/login", next)}
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
