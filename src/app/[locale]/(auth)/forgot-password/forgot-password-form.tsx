"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const RESEND_DELAY_SECONDS = 30;

export function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgotPassword");
  const tShared = useTranslations("Auth.shared");
  const tCommon = useTranslations("Common");
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

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{tShared("emailLabel")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={tShared("emailPlaceholder")}
            autoFocus
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
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
