"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Switch } from "@/components/ui/switch";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { setOverageAllowed } from "@/app/[locale]/dashboard/actions";

// Le choix s'applique tout de suite, comme le reste de la section Abonnement.
export function OverageSwitch({
  clientServiceId,
  allowed,
  describedBy,
}: {
  clientServiceId: string;
  allowed: boolean;
  describedBy: string;
}) {
  const t = useTranslations("Dashboard.overage");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    startTransition(async () => {
      try {
        unwrap(await setOverageAllowed(clientServiceId, next));
        toast.success(next ? t("acceptedToast") : t("refusedToast"));
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t("error")));
      }
    });
  }

  return (
    <Switch
      checked={allowed}
      onCheckedChange={handleChange}
      disabled={pending}
      aria-label={t("switch")}
      aria-describedby={describedBy}
    />
  );
}
