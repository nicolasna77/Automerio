"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import type { MyServiceDTO } from "@/lib/catalog";
import { cancelService } from "./actions";
import { ResumeCheckoutButton } from "./resume-checkout-button";
import { ServiceSettingsButton } from "./service-settings-button";

// Résiliation d'une solution, après confirmation. Elle se fait depuis les
// réglages (section Abonnement) et la page Abonnements, pas depuis la page de
// la solution.
export function CancelServiceButton({
  clientServiceId,
  name,
  variant = "outline",
}: {
  clientServiceId: string;
  name: string;
  variant?: "outline" | "ghost";
}) {
  const router = useRouter();
  const t = useTranslations("Dashboard.service.actions");
  const tCommon = useTranslations("Common");
  const [isCanceling, startCancelTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);

  function handleUnsubscribe() {
    startCancelTransition(async () => {
      try {
        unwrap(await cancelService(clientServiceId));
        toast.success(t("canceled", { name }));
        setConfirmCancel(false);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setConfirmCancel(true)}>
        {t("unsubscribe")}
      </Button>
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle", { name })}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleUnsubscribe} loading={isCanceling}>
              {isCanceling ? t("canceling") : t("unsubscribe")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ServiceDetailActions({ item }: { item: MyServiceDTO }) {
  const canResume = item.status === "PENDING_PAYMENT" || item.status === "CANCELED";

  return (
    <div className="flex items-center gap-2">
      {canResume && (
        <ResumeCheckoutButton
          clientServiceId={item.clientServiceId}
          status={item.status as "PENDING_PAYMENT" | "CANCELED"}
        />
      )}
      <ServiceSettingsButton item={item} labeled />
    </div>
  );
}
