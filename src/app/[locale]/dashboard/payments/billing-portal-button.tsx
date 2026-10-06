"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { openBillingPortal } from "../actions";

export function BillingPortalButton({
  organizationId,
  variant = "outline",
  size,
}: {
  organizationId: string;
  variant?: "outline" | "default";
  size?: "sm";
}) {
  const t = useTranslations("Dashboard.payments.portal");
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const { url } = unwrap(await openBillingPortal(organizationId));
        window.location.href = url;
      } catch (err) {
        toast.error(getErrorMessage(err, t("failed")));
      }
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isPending}
      aria-busy={isPending}
    >
      {isPending ? (
        <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />
      ) : (
        <CreditCard aria-hidden="true" data-icon="inline-start" />
      )}
      {t("open")}
    </Button>
  );
}
