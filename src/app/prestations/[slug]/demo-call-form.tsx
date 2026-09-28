"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, PhoneCall, PhoneIncoming } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestDemoCall } from "./demo-call-actions";

export function DemoCallForm({ serviceSlug }: { serviceSlug: string }) {
  const phoneId = useId();
  const noticeId = useId();
  const errorId = useId();
  const [isPending, startTransition] = useTransition();
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [calledNumber, setCalledNumber] = useState<string | null>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (calledNumber !== null) confirmationRef.current?.focus();
  }, [calledNumber]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestDemoCall({ phone, serviceSlug, website });
      if (result.ok) setCalledNumber(result.data.displayNumber);
      else setError(result.error);
    });
  }

  if (calledNumber !== null) {
    return (
      <div
        ref={confirmationRef}
        tabIndex={-1}
        role="status"
        className="flex items-start gap-3 rounded-3xl border border-primary/30 bg-primary/5 p-5 outline-none"
      >
        <PhoneIncoming className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="font-medium text-foreground">Votre téléphone va sonner.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {calledNumber ? `Nous appelons le ${calledNumber} dans quelques secondes. ` : ""}
            Décrochez : l&apos;assistant d&apos;Automerio se présente et répond à vos
            questions pendant trois minutes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor={`${phoneId}-website`}>Site web</label>
        <input
          id={`${phoneId}-website`}
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={phoneId}>Votre numéro de téléphone</Label>
        <Input
          id={phoneId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="06 12 34 56 78"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={isPending}
        />
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPending || phone.trim() === ""}
        aria-busy={isPending}
        aria-describedby={noticeId}
      >
        {isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />
        ) : (
          <PhoneCall aria-hidden="true" data-icon="inline-start" />
        )}
        Recevoir l&apos;appel
      </Button>

      {/* Le consentement tient a la demande elle-meme : le texte est lie au
          bouton pour qu'un lecteur d'ecran l'annonce avant l'envoi. */}
      <p id={noticeId} className="text-xs leading-relaxed text-muted-foreground">
        En demandant cet appel, vous confirmez avoir pris connaissance de{" "}
        <Link
          href="/confidentialite"
          className="underline underline-offset-4 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          nos modalités de contact et de notre politique de confidentialité
        </Link>
        . Votre numéro ne sert qu&apos;à cet appel, jamais à de la prospection.
      </p>
    </form>
  );
}
