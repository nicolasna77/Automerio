"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { PhoneCall, PhoneIncoming } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestTestCallAction } from "./test-call-actions";

export function TestCallCard({ clientServiceId }: { clientServiceId: string }) {
  const t = useTranslations("Dashboard.service.testCall");
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
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {called ? (
          <div role="status" className="flex items-start gap-3 rounded-2xl bg-primary/5 p-4">
            <PhoneIncoming className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-medium text-foreground">{t("ringing")}</p>
              <p className="mt-1 text-muted-foreground">
                {t("calling", { number: called.displayNumber })}{" "}
                {called.remaining > 0 ? t("remaining", { count: called.remaining }) : t("lastOne")}
              </p>
              {called.remaining > 0 && (
                <Button type="button" variant="link" size="sm" className="mt-1 h-auto p-0" onClick={() => setCalled(null)}>
                  {t("again")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={phoneId}>{t("phoneLabel")}</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id={phoneId}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder={t("phonePlaceholder")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  disabled={isPending}
                  className="sm:max-w-56"
                />
                <Button type="submit" disabled={phone.trim() === ""} loading={isPending}>
                  {!isPending && <PhoneCall aria-hidden="true" data-icon="inline-start" />}
                  {t("callMe")}
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
