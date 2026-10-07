"use client";

import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Switch } from "@/components/ui/switch";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { setServicePaused } from "@/app/[locale]/dashboard/actions";

// Interrupteur « en service » d'une solution : coupé, l'assistant ne décroche
// plus et ne répond plus aux messages. Le choix s'applique tout de suite.
export function PauseSwitch({
  clientServiceId,
  name,
  paused,
}: {
  clientServiceId: string;
  name: string;
  paused: boolean;
}) {
  const t = useTranslations("Dashboard.services.list.pause");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticPaused, setOptimisticPaused] = useOptimistic(paused);

  function handleChange(running: boolean) {
    startTransition(async () => {
      setOptimisticPaused(!running);
      try {
        unwrap(await setServicePaused(clientServiceId, !running));
        toast.success(running ? t("resumedToast", { name }) : t("pausedToast", { name }));
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t("error")));
      }
    });
  }

  return (
    <Switch
      size="sm"
      checked={!optimisticPaused}
      onCheckedChange={handleChange}
      disabled={pending}
      aria-label={t("switch", { name })}
      className="relative z-10"
    />
  );
}
