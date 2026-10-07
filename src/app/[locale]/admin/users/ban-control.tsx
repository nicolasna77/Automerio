"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
import { Textarea } from "@/components/ui/textarea";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { banUserAction, unbanUserAction } from "./actions";

export function BanControl({
  userId,
  banned,
  banReason,
  disabled,
}: {
  userId: string;
  banned: boolean;
  banReason: string | null;
  disabled?: boolean;
}) {
  const t = useTranslations("Admin.users.ban");
  const tCommon = useTranslations("Common");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");

  function handleUnban() {
    startTransition(async () => {
      try {
        unwrap(await unbanUserAction(userId));
        toast.success(t("unbanned"));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  function handleBan() {
    startTransition(async () => {
      try {
        unwrap(await banUserAction(userId, reason));
        toast.success(t("banned"));
        setConfirmOpen(false);
        setReason("");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  if (banned) {
    return (
      <div className="space-y-1.5">
        {banReason && (
          <p className="text-sm text-muted-foreground">{t("reason", { reason: banReason })}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnban}
          disabled={disabled || isPending}
          aria-busy={isPending}
        >
          {isPending ? t("unbanning") : t("unban")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={disabled}
      >
        {t("ban")}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder={t("reasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleBan}
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? t("banning") : t("ban")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
