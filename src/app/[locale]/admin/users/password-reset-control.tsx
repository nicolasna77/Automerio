"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Check, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { setUserPasswordAction } from "./actions";

const PASSWORD_ALPHABET =
  "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

const PASSWORD_INPUT_ID = "admin-new-password";
const PASSWORD_ERROR_ID = "admin-new-password-error";

function generatePassword(length = 14) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => PASSWORD_ALPHABET[v % PASSWORD_ALPHABET.length]).join(
    ""
  );
}

export function PasswordResetControl({
  userId,
  disabled,
}: {
  userId: string;
  disabled?: boolean;
}) {
  const t = useTranslations("Admin.users.password");
  const tCommon = useTranslations("Common");
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  // Erreur de saisie affichée sous le champ, qui reçoit le focus.
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  function reset() {
    setPassword("");
    setDone(false);
    setCopied(false);
    setFieldError(null);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setFieldError(t("tooShort"));
      document.getElementById(PASSWORD_INPUT_ID)?.focus();
      return;
    }
    setFieldError(null);
    startTransition(async () => {
      try {
        unwrap(await setUserPasswordAction(userId, password));
        setDone(true);
        toast.success(t("done"));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {t("open")}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            {!done && (
              <DialogDescription>{t("description")}</DialogDescription>
            )}
          </DialogHeader>

          {done ? (
            <>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-3 py-2">
                <code className="flex-1 truncate font-mono text-sm">
                  {password}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopy}
                  aria-label={t("copy")}
                >
                  {copied ? (
                    <Check className="text-primary" aria-hidden="true" />
                  ) : (
                    <Copy aria-hidden="true" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{t("shareOnce")}</p>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>{tCommon("close")}</Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="grid gap-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id={PASSWORD_INPUT_ID}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldError(null);
                    }}
                    placeholder={t("label")}
                    aria-label={t("label")}
                    aria-invalid={fieldError ? true : undefined}
                    aria-describedby={fieldError ? PASSWORD_ERROR_ID : undefined}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPassword(generatePassword());
                      setFieldError(null);
                    }}
                    disabled={isPending}
                  >
                    {t("generate")}
                  </Button>
                </div>
                {fieldError && (
                  <p id={PASSWORD_ERROR_ID} className="text-sm text-destructive">
                    {fieldError}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" loading={isPending}>
                  {isPending ? t("resetting") : t("reset")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
