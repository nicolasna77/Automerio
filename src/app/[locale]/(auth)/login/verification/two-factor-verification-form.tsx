"use client";

import { Link } from "@/i18n/navigation";
import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { redirectAfterSignIn } from "../redirect-after-sign-in";

export function TwoFactorVerificationForm({ next }: { next: string | null }) {
  const t = useTranslations("Auth.verification");
  const tShared = useTranslations("Auth.shared");
  const router = useRouter();
  const codeId = useId();
  const trustId = useId();
  const errorId = useId();
  const codeErrorId = useId();
  const codeRef = useRef<HTMLInputElement>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = code.replace(/\s+/g, "");
    // Bouton toujours actif : un code vide est signalé sous le champ.
    if (!trimmed) {
      setCodeError(t("errors.codeRequired"));
      codeRef.current?.focus();
      return;
    }
    setCodeError(null);
    setLoading(true);

    const { error } = useBackupCode
      ? await authClient.twoFactor.verifyBackupCode({ code: trimmed, trustDevice })
      : await authClient.twoFactor.verifyTotp({ code: trimmed, trustDevice });

    if (error) {
      setLoading(false);
      setError(
        error.status === 401 && error.code?.includes("COOKIE")
          ? t("errors.expired")
          : useBackupCode
            ? t("errors.invalidBackupCode")
            : t("errors.invalidCode")
      );
      codeRef.current?.select();
      return;
    }

    await redirectAfterSignIn(router, next);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {useBackupCode
          ? t("descriptionBackup")
          : t("descriptionTotp")}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor={codeId}>{useBackupCode ? t("backupCodeLabel") : t("codeLabel")}</Label>
          <Input
            ref={codeRef}
            id={codeId}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (codeError) setCodeError(null);
            }}
            maxLength={useBackupCode ? 32 : 8}
            spellCheck={false}
            inputMode={useBackupCode ? "text" : "numeric"}
            autoComplete="one-time-code"
            autoFocus
            required
            aria-invalid={error || codeError ? true : undefined}
            aria-describedby={[codeError ? codeErrorId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined}
            className="text-center font-mono text-lg tabular-nums tracking-[0.4em]"
          />
          {codeError && (
            <p id={codeErrorId} className="text-sm text-destructive">
              {codeError}
            </p>
          )}
        </div>
        <label htmlFor={trustId} className="flex min-h-6 items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            id={trustId}
            checked={trustDevice}
            onCheckedChange={(checked) => setTrustDevice(checked === true)}
          />
          {t("trustDevice")}
        </label>

        {error && (
          <Alert variant="destructive" id={errorId}>
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full"
          loading={loading}
        >
          {loading ? t("submitting") : t("submit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setUseBackupCode((prev) => !prev);
            setCode("");
            setError(null);
            setCodeError(null);
            codeRef.current?.focus();
          }}
        >
          {useBackupCode ? t("useApp") : t("useBackupCode")}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:focus-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {tShared("returnToLogin")}
      </Link>
    </div>
  );
}
