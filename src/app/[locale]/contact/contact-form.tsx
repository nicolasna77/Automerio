"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, PhoneCall } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactMessage } from "./actions";
import { LONG_FIELD_MAX, SHORT_FIELD_MAX } from "@/lib/form-limits";

const EMPTY_VALUES = { name: "", email: "", activity: "", message: "", website: "" };

type Field = "name" | "email" | "message";
type FieldErrors = Partial<Record<Field, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Formulaire de contact : chaque erreur s'affiche sous son champ et le focus
// va au premier champ à corriger ; une erreur du serveur (limite d'envoi…)
// s'affiche au-dessus du bouton. Après l'envoi, deux suites possibles.
export function ContactForm({ demoAvailable }: { demoAvailable: boolean }) {
  const t = useTranslations("Contact.form");
  const ids = { name: useId(), email: useId(), activity: useId(), message: useId() };
  const hintIds = { email: useId(), message: useId() };
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [isPending, startTransition] = useTransition();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sentTo !== null) confirmationRef.current?.focus();
  }, [sentTo]);

  function set(key: keyof typeof EMPTY_VALUES, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): FieldErrors {
    const found: FieldErrors = {};
    if (!values.name.trim()) found.name = t("errors.name");
    if (!EMAIL.test(values.email.trim())) found.email = t("errors.email");
    if (!values.message.trim()) found.message = t("errors.message");
    return found;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setServerError(null);
    const found = validate();
    setErrors(found);
    const first = (["name", "email", "message"] as const).find((field) => found[field]);
    if (first) {
      ({ name: nameRef, email: emailRef, message: messageRef })[first].current?.focus();
      return;
    }
    startTransition(async () => {
      const result = await submitContactMessage(values);
      if (result.status === "success") setSentTo(values.email.trim());
      else setServerError(result.error ?? t("errors.generic"));
    });
  }

  // aria-describedby : l'aide du champ, puis son erreur quand il y en a une.
  const describedBy = (field: Field, hint?: string) =>
    [hint, errors[field] ? `${ids[field]}-error` : null].filter(Boolean).join(" ") || undefined;

  if (sentTo !== null) {
    return (
      <Card>
        <CardContent>
          <div ref={confirmationRef} tabIndex={-1} role="status" className="outline-none">
            <CheckCircle2 className="size-6 text-primary" aria-hidden="true" />
            <p className="mt-3 text-lg font-semibold text-foreground">{t("sent")}</p>
            <p className="mt-1 text-muted-foreground">{t("sentDetail", { email: sentTo })}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {demoAvailable && (
              <Link href="/#essai" className={buttonVariants()}>
                <PhoneCall data-icon="inline-start" aria-hidden="true" />
                {t("thenDemo")}
              </Link>
            )}
            <Link href="/#services" className={buttonVariants({ variant: "outline" })}>
              {t("thenServices")}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fieldError = (field: Field) =>
    errors[field] ? (
      <p id={`${ids[field]}-error`} className="text-sm text-destructive">
        {errors[field]}
      </p>
    ) : null;

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="absolute left-[-9999px]" aria-hidden="true">
            <Label htmlFor={`${ids.name}-website`}>{t("honeypot")}</Label>
            <Input
              id={`${ids.name}-website`}
              tabIndex={-1}
              autoComplete="off"
              value={values.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={ids.name}>{t("name")}</Label>
              <Input
                ref={nameRef}
                id={ids.name}
                autoComplete="name"
                maxLength={SHORT_FIELD_MAX}
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={describedBy("name")}
              />
              {fieldError("name")}
            </div>
            <div className="space-y-2">
              <Label htmlFor={ids.email}>{t("email")}</Label>
              <Input
                ref={emailRef}
                id={ids.email}
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                maxLength={SHORT_FIELD_MAX}
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={describedBy("email", hintIds.email)}
              />
              <p id={hintIds.email} className="text-sm text-muted-foreground">
                {t("emailHint")}
              </p>
              {fieldError("email")}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={ids.activity}>
              {t("activity")}
              <span className="font-normal text-muted-foreground">{t("optional")}</span>
            </Label>
            <Input
              id={ids.activity}
              maxLength={SHORT_FIELD_MAX}
              placeholder={t("activityPlaceholder")}
              value={values.activity}
              onChange={(e) => set("activity", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={ids.message}>{t("message")}</Label>
            {/* La consigne reste visible pendant la saisie : un placeholder
                disparaîtrait à la première lettre. */}
            <p id={hintIds.message} className="text-sm text-muted-foreground">
              {t("messageHint")}
            </p>
            <Textarea
              ref={messageRef}
              id={ids.message}
              rows={6}
              maxLength={LONG_FIELD_MAX}
              value={values.message}
              onChange={(e) => set("message", e.target.value)}
              aria-invalid={errors.message ? true : undefined}
              aria-describedby={describedBy("message", hintIds.message)}
            />
            {fieldError("message")}
          </div>

          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t("privacy")}</p>
            <Button type="submit" size="lg" loading={isPending} className="shrink-0">
              {isPending ? (
                t("sending")
              ) : (
                <>
                  {t("submit")}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
