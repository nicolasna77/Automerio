"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { redirectAfterSignIn } from "../redirect-after-sign-in";

export function TwoFactorVerificationForm({ next }: { next: string | null }) {
  const router = useRouter();
  const codeId = useId();
  const trustId = useId();
  const errorId = useId();
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const trimmed = code.replace(/\s+/g, "");
    const { error } = useBackupCode
      ? await authClient.twoFactor.verifyBackupCode({ code: trimmed, trustDevice })
      : await authClient.twoFactor.verifyTotp({ code: trimmed, trustDevice });

    if (error) {
      setLoading(false);
      setError(
        error.status === 401 && error.code?.includes("COOKIE")
          ? "La vérification a expiré. Reconnectez-vous."
          : useBackupCode
            ? "Ce code de secours n'est pas valable."
            : "Code incorrect. Vérifiez que l'heure de votre téléphone est à jour, puis réessayez."
      );
      return;
    }

    await redirectAfterSignIn(router, next);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Vérification en deux étapes
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {useBackupCode
          ? "Saisissez l'un des codes de secours obtenus à l'activation."
          : "Saisissez le code à 6 chiffres affiché dans votre application d'authentification."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor={codeId}>{useBackupCode ? "Code de secours" : "Code"}</Label>
          <Input
            id={codeId}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode={useBackupCode ? "text" : "numeric"}
            autoComplete="one-time-code"
            autoFocus
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="text-center text-lg tabular-nums tracking-[0.4em]"
          />
        </div>
        <label htmlFor={trustId} className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            id={trustId}
            checked={trustDevice}
            onCheckedChange={(checked) => setTrustDevice(checked === true)}
          />
          Ne plus demander sur cet appareil pendant 30 jours
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
          disabled={loading || !code.trim()}
          aria-busy={loading}
        >
          {loading ? "Vérification…" : "Valider"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setUseBackupCode((prev) => !prev);
            setCode("");
            setError(null);
          }}
        >
          {useBackupCode ? "Utiliser mon application" : "Utiliser un code de secours"}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:focus-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Revenir à la connexion
      </Link>
    </div>
  );
}
