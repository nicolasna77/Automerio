"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
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
import { deactivatePromoCodeAction } from "./actions";

export function DeactivatePromoCodeButton({ id, code }: { id: string; code: string }) {
  const t = useTranslations("Admin.promoCodes");
  const tCommon = useTranslations("Common");
  const tActions = useTranslations("Actions");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        unwrap(await deactivatePromoCodeAction(id, code));
        toast.success(t("deactivated", { code }));
        setOpen(false);
      } catch (err) {
        toast.error(getErrorMessage(err, tActions("generic")));
      }
    });
  }

  return (
    <>
      <Button variant="ghost" size="xs" onClick={() => setOpen(true)}>
        {t("deactivate")}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deactivateTitle", { code })}</AlertDialogTitle>
            <AlertDialogDescription>{t("deactivateDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={pending}>
              {pending ? t("deactivating") : t("deactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
