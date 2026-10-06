"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ProfileSection } from "./profile-section";

export function PasswordForm() {
  const t = useTranslations("Dashboard.profile.password");
  const tCommon = useTranslations("Common");
  const tAccount = useTranslations("Dashboard.profile.account");
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  // Erreur de saisie affichée sous le champ concerné, qui reçoit le focus.
  const [fieldError, setFieldError] = useState<{ field: "newPassword" | "confirmPassword"; message: string } | null>(null);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFieldError(null);
  }

  function showFieldError(field: "newPassword" | "confirmPassword", message: string) {
    setFieldError({ field, message });
    document.getElementById(field)?.focus();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldError(null);

    if (newPassword.length < 8) {
      showFieldError("newPassword", t("tooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      showFieldError("confirmPassword", t("mismatch"));
      return;
    }

    startTransition(async () => {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        toast.error(error.message ?? tAccount("error"));
        return;
      }
      toast.success(t("updated"));
      reset();
      setOpen(false);
    });
  }

  return (
    <ProfileSection
      title={t("title")}
      description={t("description")}
      action={
        !open && (
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            {t("change")}
          </Button>
        )
      }
    >
      {open && (
        <form onSubmit={handleSubmit} className="grid gap-4 sm:max-w-md">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t("current")}</Label>
            <Input
              id="currentPassword"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("new")}</Label>
            <Input
              id="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-invalid={fieldError?.field === "newPassword" ? true : undefined}
              aria-describedby={fieldError?.field === "newPassword" ? "newPassword-hint newPassword-error" : "newPassword-hint"}
            />
            <p id="newPassword-hint" className="text-xs text-muted-foreground">{t("minLength")}</p>
            {fieldError?.field === "newPassword" && (
              <p id="newPassword-error" className="text-sm text-destructive">{fieldError.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirm")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={fieldError?.field === "confirmPassword" ? true : undefined}
              aria-describedby={fieldError?.field === "confirmPassword" ? "confirmPassword-error" : undefined}
            />
            {fieldError?.field === "confirmPassword" && (
              <p id="confirmPassword-error" className="text-sm text-destructive">{fieldError.message}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? t("updating") : t("update")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </form>
      )}
    </ProfileSection>
  );
}
