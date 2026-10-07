"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
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
import { cn } from "cn";

const AFTER_VERIFICATION_URL = "/dashboard";
const MIN_PASSWORD_LENGTH = 8;
const RESEND_DELAY_SECONDS = 30;

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
      callbackURL: afterVerificationUrl,
    });

    setLoading(false);
    if (error) {
      setError(
        error.status === 422
          ? t("errors.emailTaken")
          : t("errors.generic")
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
      <div>
        <MailCheck className="size-6 text-primary" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          {tShared("checkInbox")}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {t.rich("sentMessage", {
            email: sentTo,
            strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
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
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {tShared("or")}
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("nameLabel")}</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            autoFocus
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">
            {t("companyLabel")} <span className="text-muted-foreground">{t("optional")}</span>
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
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={tShared("emailPlaceholder")}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "signup-error" : undefined}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{tShared("passwordLabel")}</Label>
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
            {tShared("minLength", { min: MIN_PASSWORD_LENGTH })}
          </p>
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

      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
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
