"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Loader2, PhoneCall, PhoneIncoming } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestTestCallAction } from "./test-call-actions";

export function TestCallCard({ clientServiceId }: { clientServiceId: string }) {
  const phoneId = useId();
  const errorId = useId();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [called, setCalled] = useState<{ displayNumber: string; remaining: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestTestCallAction(clientServiceId, phone);
      if (result.ok) setCalled(result.data);
      else setError(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">
          Tester votre assistant
        </CardTitle>
        <CardDescription>
          L&apos;assistant vous appelle avec vos réglages actuels. Rien n&apos;est enregistré : ni
          rendez-vous, ni commande, et l&apos;appel ne compte pas dans votre forfait.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {called ? (
          <div role="status" className="flex items-start gap-3 rounded-2xl bg-primary/5 p-4">
            <PhoneIncoming className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Votre téléphone va sonner.</p>
              <p className="mt-1 text-muted-foreground">
                Nous appelons le {called.displayNumber}. Faites comme un client : demandez vos
                horaires, un rendez-vous, un transfert.{" "}
                {called.remaining > 0
                  ? `Il vous reste ${called.remaining} test${called.remaining > 1 ? "s" : ""} aujourd'hui.`
                  : "C'était votre dernier test aujourd'hui."}
              </p>
              {called.remaining > 0 && (
                <Button type="button" variant="link" size="sm" className="mt-1 h-auto p-0" onClick={() => setCalled(null)}>
                  Refaire un test
                </Button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={phoneId}>Votre numéro de téléphone</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
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
                  className="sm:max-w-56"
                />
                <Button type="submit" disabled={isPending || phone.trim() === ""} aria-busy={isPending}>
                  {isPending ? (
                    <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />
                  ) : (
                    <PhoneCall aria-hidden="true" data-icon="inline-start" />
                  )}
                  M&apos;appeler
                </Button>
              </div>
            </div>
            {error && (
              <p id={errorId} role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
