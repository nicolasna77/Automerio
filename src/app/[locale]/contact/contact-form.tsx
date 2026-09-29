"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactMessage } from "./actions";

const EMPTY_VALUES = {
  name: "",
  email: "",
  activity: "",
  message: "",
  website: "",
};

export function ContactForm() {
  const t = useTranslations("Contact.form");
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [values, setValues] = useState(EMPTY_VALUES);
  const confirmationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sent) confirmationRef.current?.focus();
  }, [sent]);

  function set(key: keyof typeof EMPTY_VALUES, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await submitContactMessage(values);
      if (result.status === "success") {
        setSent(true);
      } else {
        toast.error(result.error ?? t("genericError"));
      }
    });
  }

  if (sent) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <CardContent>
          <div ref={confirmationRef} tabIndex={-1} className="outline-none">
            <p className="font-medium text-foreground">{t("sent")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("sentDetail")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="absolute left-[-9999px]" aria-hidden="true">
            <Label htmlFor="website">{t("honeypot")}</Label>
            <Input
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={values.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                autoComplete="name"
                required
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity">
              {t("activity")}
              <span className="font-normal text-muted-foreground">
                {t("optional")}
              </span>
            </Label>
            <Input
              id="activity"
              placeholder={t("activityPlaceholder")}
              value={values.activity}
              onChange={(e) => set("activity", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">{t("message")}</Label>
            <Textarea
              id="message"
              required
              rows={5}
              placeholder={t("messagePlaceholder")}
              value={values.message}
              onChange={(e) => set("message", e.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            aria-busy={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2
                  className="animate-spin"
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                {t("sending")}
              </>
            ) : (
              <>
                {t("submit")}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
