"use client";

import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { setServicePaused } from "@/app/[locale]/dashboard/actions";

// Interrupteur « en service » d'une solution : coupé, l'assistant ne décroche
// plus et ne répond plus aux messages. Le choix s'applique tout de suite.
// L'état est écrit dans la piste (« Activé » / « Désactivé ») : il se lit sans
// dépendre de la couleur ni de la position du curseur.
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
  const [pending, startTransition] = useTransition();
  const [optimisticPaused, setOptimisticPaused] = useOptimistic(paused);

  function handleChange(running: boolean) {
    startTransition(async () => {
      setOptimisticPaused(!running);
      try {
        unwrap(await setServicePaused(clientServiceId, !running));
        // revalidatePath, dans l'action, renvoie déjà la page à jour.
        toast.success(running ? t("resumedToast", { name }) : t("pausedToast", { name }));
      } catch (err) {
        toast.error(getErrorMessage(err, t("error")));
      }
    });
  }

  return (
    <SwitchPrimitive.Root
      checked={!optimisticPaused}
      onCheckedChange={handleChange}
      disabled={pending}
      aria-label={t("switch", { name })}
      className="group/pause relative z-10 inline-flex h-7 w-24 shrink-0 items-center rounded-full border outline-none transition-colors focus-visible:focus-ring data-checked:border-primary data-checked:bg-primary data-unchecked:border-border data-unchecked:bg-muted data-disabled:cursor-progress data-disabled:opacity-70 motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-xs font-medium text-primary-foreground opacity-0 transition-opacity group-data-checked/pause:opacity-100 motion-reduce:transition-none"
      >
        {t("on")}
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs font-medium text-muted-foreground transition-opacity group-data-checked/pause:opacity-0 motion-reduce:transition-none"
      >
        {t("off")}
      </span>
      <SwitchPrimitive.Thumb className="pointer-events-none absolute left-0.5 size-5 rounded-full bg-background shadow-sm ring-1 ring-foreground/5 transition-[left] data-checked:left-[calc(100%-1.375rem)] motion-reduce:transition-none" />
    </SwitchPrimitive.Root>
  );
}
