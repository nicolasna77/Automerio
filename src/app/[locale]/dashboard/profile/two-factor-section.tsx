"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import dynamic from "next/dynamic";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ProfileSection } from "./profile-section";

const QRCode = dynamic(() => import("react-qr-code"), {
  ssr: false,
  loading: () => <div className="size-[168px] animate-pulse rounded-md bg-muted" aria-hidden="true" />,
});

type Step =
  | { kind: "idle" }
  | { kind: "password"; mode: "enable" | "disable" }
  | { kind: "scan"; totpURI: string; backupCodes: string[] }
  | { kind: "backup"; backupCodes: string[] };

function secretOf(totpURI: string): string {
  try {
    return new URL(totpURI).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export function TwoFactorSection({
  enabled,
  requiresPassword,
}: {
  enabled: boolean;
  requiresPassword: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("Dashboard.profile.twoFactor");
  const tCommon = useTranslations("Common");
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();

  function close() {
    setStep({ kind: "idle" });
    setPassword("");
    setCode("");
  }

  function handlePassword(event: FormEvent) {
    event.preventDefault();
    if (step.kind !== "password") return;
    const credentials = requiresPassword ? { password } : {};

    startTransition(async () => {
      if (step.mode === "enable") {
        const { data, error } = await authClient.twoFactor.enable(credentials);
        if (error || !data) {
          toast.error(
            error?.status === 400 || error?.status === 401
              ? t("wrongPassword")
              : t("enableFailed")
          );
          return;
        }
        setPassword("");
        setStep({ kind: "scan", totpURI: data.totpURI, backupCodes: data.backupCodes });
        return;
      }

      const { error } = await authClient.twoFactor.disable(credentials);
      if (error) {
        toast.error(
          error.status === 400 || error.status === 401
            ? t("wrongPassword")
            : t("disableFailed")
        );
        return;
      }
      toast.success(t("disabled"));
      close();
      router.refresh();
    });
  }

  function handleCode(event: FormEvent) {
    event.preventDefault();
    if (step.kind !== "scan") return;
    const { backupCodes } = step;

    startTransition(async () => {
      const { error } = await authClient.twoFactor.verifyTotp({
        code: code.replace(/\s+/g, ""),
      });
      if (error) {
        toast.error(t("wrongCode"));
        return;
      }
      setCode("");
      setStep({ kind: "backup", backupCodes });
      router.refresh();
    });
  }

  async function copyBackupCodes(codes: string[]) {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  const description = enabled ? t("enabledDescription") : t("disabledDescription");

  return (
    <ProfileSection
      id="two-factor"
      title={t("title")}
      description={description}
      action={
        step.kind === "idle" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep({ kind: "password", mode: enabled ? "disable" : "enable" })}
          >
            {enabled ? t("disable") : t("enable")}
          </Button>
        )
      }
    >
      {step.kind === "password" && (
        <form onSubmit={handlePassword} className="grid gap-4 sm:max-w-md">
          {requiresPassword ? (
            <div className="space-y-2">
              <Label htmlFor="two-factor-password">{t("password")}</Label>
              <Input
                id="two-factor-password"
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {step.mode === "enable" ? t("enableIntro") : t("disableIntro")}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? t("wait") : step.mode === "enable" ? tCommon("continue") : t("disable")}
            </Button>
            <Button type="button" variant="ghost" disabled={isPending} onClick={close}>
              {tCommon("cancel")}
            </Button>
          </div>
        </form>
      )}

      {step.kind === "scan" && (
        <form onSubmit={handleCode} className="grid gap-5 sm:max-w-md">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>{t("steps.open")}</li>
            <li>{t("steps.scan")}</li>
            <li>{t("steps.enter")}</li>
          </ol>
          <div className="w-fit rounded-2xl bg-white p-3">
            <QRCode value={step.totpURI} size={168} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("manualKey")}</p>
            <code className="block break-all rounded-xl bg-muted px-3 py-2 font-mono text-sm">
              {secretOf(step.totpURI)}
            </code>
          </div>
          <div className="space-y-2">
            <Label htmlFor="two-factor-code">{t("code")}</Label>
            <Input
              id="two-factor-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="tabular-nums tracking-widest"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending || !code.trim()} aria-busy={isPending}>
              {isPending ? t("verifying") : t("verify")}
            </Button>
            <Button type="button" variant="ghost" disabled={isPending} onClick={close}>
              {tCommon("cancel")}
            </Button>
          </div>
        </form>
      )}

      {step.kind === "backup" && (
        <div className="grid gap-4 sm:max-w-md">
          <p className="text-sm text-foreground">
            {t("backupIntro")}
          </p>
          <ul className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-4 font-mono text-sm">
            {step.backupCodes.map((backupCode) => (
              <li key={backupCode}>{backupCode}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => copyBackupCodes(step.backupCodes)}>
              {t("copyCodes")}
            </Button>
            <Button type="button" onClick={close}>
              {t("kept")}
            </Button>
          </div>
        </div>
      )}
    </ProfileSection>
  );
}
