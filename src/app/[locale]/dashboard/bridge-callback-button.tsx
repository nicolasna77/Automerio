"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { PhoneForwarded } from "lucide-react";
import { toast } from "@/lib/toast";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bridgeCallback } from "./callback-actions";

// Dernier mobile saisi sur cet appareil : simple confort, jamais indispensable.
const MOBILE_KEY = "automerio:callback-mobile";

function readSavedMobile(): string {
  try {
    return window.localStorage.getItem(MOBILE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveMobile(value: string) {
  try {
    window.localStorage.setItem(MOBILE_KEY, value);
  } catch {
    // Stockage indisponible (navigation privée) : rien à retenir.
  }
}

// « Rappeler via Automerio » : le mobile indiqué sonne, puis l'appelant est
// composé et voit le numéro de la solution, pas le numéro personnel.
export function BridgeCallbackButton({ callId, label }: { callId: string; label: string }) {
  const t = useTranslations("Dashboard.overview.callbacks.bridge");
  const tCommon = useTranslations("Common");
  const fieldId = useId();
  const hintId = useId();
  const errorId = useId();
  const fieldRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openDialog() {
    setMobile(readSavedMobile());
    setError(null);
    setOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!mobile.trim()) {
      setError(t("mobileRequired"));
      fieldRef.current?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await bridgeCallback(callId, mobile));
        saveMobile(mobile.trim());
        setOpen(false);
        toast.success(t("ringing"));
      } catch (err) {
        setError(getErrorMessage(err));
        fieldRef.current?.focus();
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={openDialog} aria-label={t("buttonLabel", { label })}>
        <PhoneForwarded aria-hidden="true" data-icon="inline-start" />
        {t("button")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2">
              <Label htmlFor={fieldId}>{t("mobileLabel")}</Label>
              <Input
                ref={fieldRef}
                id={fieldId}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t("mobilePlaceholder")}
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={[hintId, error ? errorId : null].filter(Boolean).join(" ")}
              />
              <p id={hintId} className="text-sm text-muted-foreground">
                {t("mobileHint")}
              </p>
              {error && (
                <p id={errorId} className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" loading={pending}>
                {t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
