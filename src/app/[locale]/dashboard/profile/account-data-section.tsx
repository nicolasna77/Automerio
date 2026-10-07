"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Download } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ProfileSection } from "./profile-section";

type DataT = ReturnType<typeof useTranslations<"Dashboard.profile.data">>;

function describeDeletionError(error: { status: number; code?: string; message?: string }, t: DataT): string {
  if (error.code === "INVALID_PASSWORD" || error.status === 400) return t("wrongPassword");
  if (error.code === "SESSION_EXPIRED" || error.status === 401) return t("reconnect");
  if (error.status === 403 && error.message) return error.message;
  return t("deleteFailed");
}

export function AccountDataSection({ requiresPassword }: { requiresPassword: boolean }) {
  const router = useRouter();
  const t = useTranslations("Dashboard.profile.data");
  const tCommon = useTranslations("Common");
  const CONFIRMATION_WORD = t("confirmWord");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  const canDelete =
    confirmation.trim().toUpperCase() === CONFIRMATION_WORD && (!requiresPassword || password);

  function reset() {
    setPassword("");
    setConfirmation("");
  }

  function handleDelete() {
    startTransition(async () => {
      const { error } = await authClient.deleteUser(requiresPassword ? { password } : {});
      if (error) {
        toast.error(describeDeletionError(error, t));
        return;
      }
      toast.success(t("deleted"));
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <>
      <ProfileSection
        title={t("title")}
        description={t("description")}
      >
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href="/dashboard/profile/export" download />}
        >
          <Download aria-hidden="true" data-icon="inline-start" />
          {t("export")}
        </Button>
      </ProfileSection>

      <ProfileSection
        title={t("deleteTitle")}
        description={t("deleteDescription")}
      >
        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          {t("deleteAccount")}
        </Button>

        <AlertDialog
          open={confirmOpen}
          onOpenChange={(open) => {
            setConfirmOpen(open);
            if (!open) reset();
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription render={<div />}>
                <ul className="list-disc space-y-1 pl-5 text-left">
                  <li>{t("consequences.subscriptions")}</li>
                  <li>{t("consequences.numbers")}</li>
                  <li>{t("consequences.data")}</li>
                  <li>{t("consequences.invoices")}</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="grid gap-4">
              {requiresPassword && (
                <div className="space-y-2">
                  <Label htmlFor="delete-password">{t("password")}</Label>
                  <Input
                    id="delete-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">
                  {t("typeToConfirm", { word: CONFIRMATION_WORD })}
                </Label>
                <Input
                  id="delete-confirmation"
                  autoComplete="off"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>{tCommon("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDelete}
                disabled={!canDelete}
                loading={isPending}
              >
                {isPending ? tCommon("deleting") : t("deleteAccount")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ProfileSection>
    </>
  );
}
