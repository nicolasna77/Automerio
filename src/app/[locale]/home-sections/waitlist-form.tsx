"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinWaitlist } from "../waitlist-actions";

const EMPTY = { email: "", name: "", company: "", phone: "", website: "" };

export function WaitlistForm() {
  const t = useTranslations("Waitlist.form");
  const id = useId();
  const [values, setValues] = useState(EMPTY);
  const [wantsCallback, setWantsCallback] = useState(false);
  const [wantsNewsletter, setWantsNewsletter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const confirmationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sent) confirmationRef.current?.focus();
  }, [sent]);

  function set(key: keyof typeof EMPTY, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await joinWaitlist({ ...values, wantsCallback, wantsNewsletter });
        if (result.status === "success") setSent(true);
        else setError(result.error);
      } catch {
        setError(t("genericError"));
      }
    });
  }

  if (sent) {
    return (
      <div
        ref={confirmationRef}
        tabIndex={-1}
        role="status"
        className="rounded-lg border border-primary/30 bg-primary/5 p-6 outline-none"
      >
        <p className="font-medium text-foreground">{t("sent")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("sentDetail")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor={`${id}-website`}>{t("honeypot")}</label>
        <input
          id={`${id}-website`}
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => set("website", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-email`}>{t("email")}</Label>
        <Input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={isPending}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-name`}>
            {t("name")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
          </Label>
          <Input
            id={`${id}-name`}
            autoComplete="name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-company`}>
            {t("company")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
          </Label>
          <Input
            id={`${id}-company`}
            autoComplete="organization"
            value={values.company}
            onChange={(e) => set("company", e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-phone`}>
          {t("phone")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
        </Label>
        <Input
          id={`${id}-phone`}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
          aria-describedby={`${id}-phone-hint`}
          disabled={isPending}
        />
        <p id={`${id}-phone-hint`} className="text-xs text-muted-foreground">
          {t("phoneHint")}
        </p>
      </div>

      <fieldset className="space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id={`${id}-callback`}
            checked={wantsCallback}
            onCheckedChange={(checked) => setWantsCallback(checked === true)}
            disabled={isPending}
            className="mt-0.5"
          />
          <Label htmlFor={`${id}-callback`} className="font-normal leading-snug">
            {t("callback")}
          </Label>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id={`${id}-newsletter`}
            checked={wantsNewsletter}
            onCheckedChange={(checked) => setWantsNewsletter(checked === true)}
            disabled={isPending}
            className="mt-0.5"
          />
          <Label htmlFor={`${id}-newsletter`} className="font-normal leading-snug">
            {t("newsletter")}
          </Label>
        </div>
      </fieldset>

      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full sm:w-auto" loading={isPending}>
        {isPending ? t("sending") : (
          <>
            {t("submit")}
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </>
        )}
      </Button>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t.rich("notice", {
          link: (chunks) => (
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}
