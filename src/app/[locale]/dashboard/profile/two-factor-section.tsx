"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
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
              ? "Mot de passe incorrect."
              : "L'activation a échoué. Réessayez dans un instant."
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
            ? "Mot de passe incorrect."
            : "La désactivation a échoué. Réessayez dans un instant."
        );
        return;
      }
      toast.success("Double authentification désactivée.");
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
        toast.error(
          "Code incorrect. Vérifiez que l'heure de votre téléphone est à jour, puis réessayez."
        );
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
      toast.success("Codes copiés.");
    } catch {
      toast.error("Copie impossible — recopiez-les à la main.");
    }
  }

  const description = enabled
    ? "Activée : un code de votre application vous est demandé à chaque connexion sur un nouvel appareil."
    : "Ajoutez à votre mot de passe un code à 6 chiffres, généré par une application comme Google Authenticator ou 1Password.";

  return (
    <ProfileSection
      id="two-factor"
      title="Double authentification"
      description={description}
      action={
        step.kind === "idle" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep({ kind: "password", mode: enabled ? "disable" : "enable" })}
          >
            {enabled ? "Désactiver" : "Activer"}
          </Button>
        )
      }
    >
      {step.kind === "password" && (
        <form onSubmit={handlePassword} className="grid gap-4 sm:max-w-md">
          {requiresPassword ? (
            <div className="space-y-2">
              <Label htmlFor="two-factor-password">Mot de passe</Label>
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
              {step.mode === "enable"
                ? "Vous allez associer une application d'authentification à votre compte."
                : "Les connexions ne demanderont plus de code."}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? "Un instant…" : step.mode === "enable" ? "Continuer" : "Désactiver"}
            </Button>
            <Button type="button" variant="ghost" disabled={isPending} onClick={close}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      {step.kind === "scan" && (
        <form onSubmit={handleCode} className="grid gap-5 sm:max-w-md">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Ouvrez votre application d&apos;authentification.</li>
            <li>Scannez ce QR code, ou saisissez la clé à la main.</li>
            <li>Entrez le code à 6 chiffres qu&apos;elle affiche.</li>
          </ol>
          <div className="w-fit rounded-2xl bg-white p-3">
            <QRCode value={step.totpURI} size={168} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Clé à saisir à la main</p>
            <code className="block break-all rounded-xl bg-muted px-3 py-2 font-mono text-sm">
              {secretOf(step.totpURI)}
            </code>
          </div>
          <div className="space-y-2">
            <Label htmlFor="two-factor-code">Code affiché</Label>
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
              {isPending ? "Vérification…" : "Vérifier et activer"}
            </Button>
            <Button type="button" variant="ghost" disabled={isPending} onClick={close}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      {step.kind === "backup" && (
        <div className="grid gap-4 sm:max-w-md">
          <p className="text-sm text-foreground">
            Double authentification activée. Gardez ces codes de secours en lieu
            sûr : chacun permet une connexion si vous perdez votre téléphone. Ils
            ne seront plus affichés.
          </p>
          <ul className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-4 font-mono text-sm">
            {step.backupCodes.map((backupCode) => (
              <li key={backupCode}>{backupCode}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => copyBackupCodes(step.backupCodes)}>
              Copier les codes
            </Button>
            <Button type="button" onClick={close}>
              J&apos;ai conservé mes codes
            </Button>
          </div>
        </div>
      )}
    </ProfileSection>
  );
}
