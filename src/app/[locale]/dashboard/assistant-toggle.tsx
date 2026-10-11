"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";
import { usePauseToggle } from "./pause-switch";

// Bloc « Assistant » de la page d'une solution, à côté du quota (sans carte),
// de haut en bas : le titre, l'état en une phrase, puis l'interrupteur dont
// la poignée porte une icône (coche activé, croix désactivé) qui se
// transforme au basculement.
// Sans droit de gestion, la carte montre l'état sans interrupteur.
// La phrase d'état dit ce que l'assistant fait sur ce canal (appels ou
// messages) ; tant que la mise en service n'est pas finie (`ready` faux : pas
// de numéro, compte non relié), elle ne promet pas qu'il répond déjà.
export function AssistantToggle({
  clientServiceId,
  name,
  paused,
  canManage,
  channel,
  ready,
}: {
  clientServiceId: string;
  name: string;
  paused: boolean;
  canManage: boolean;
  channel: "calls" | "messages";
  ready: boolean;
}) {
  const t = useTranslations("Dashboard.services.list.pause");
  const toggle = usePauseToggle(clientServiceId, name, paused);
  const descriptionId = useId();
  const running = !toggle.paused;

  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">{t("cardTitle")}</p>
      <p id={descriptionId} className="mt-0.5 text-sm text-muted-foreground" aria-live="polite">
        {!running
          ? t("cardOff")
          : !ready
            ? t("cardWaiting")
            : channel === "calls"
              ? t("cardOnCalls")
              : t("cardOnMessages")}
      </p>
      {canManage && (
        <SwitchPrimitive.Root
          checked={running}
          onCheckedChange={toggle.setRunning}
          disabled={toggle.pending}
          aria-label={t("switch", { name })}
          aria-describedby={descriptionId}
          className="group/assistant mt-3 inline-flex h-8 w-14 shrink-0 items-center rounded-full border p-0.5 outline-none transition-colors focus-visible:focus-ring data-checked:border-primary data-checked:bg-primary data-unchecked:border-border data-unchecked:bg-muted data-disabled:cursor-progress data-disabled:opacity-70 motion-reduce:transition-none"
        >
          {/* Poignée dans le flux, déplacée par translation (comme le Switch
              de components/ui) : 56 px de piste, 1 px de bordure et 2 px de
              marge de chaque côté laissent 26 px de course. La coche et la
              croix se croisent en tournant. */}
          <SwitchPrimitive.Thumb
            className={cn(
              "pointer-events-none relative flex size-6 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-foreground/5",
              "translate-x-0 transition-transform duration-200 ease-out data-checked:translate-x-6.5",
              "motion-reduce:transition-none"
            )}
          >
            <Check
              aria-hidden="true"
              strokeWidth={3}
              className="absolute size-3.5 scale-50 -rotate-90 text-primary opacity-0 transition-[opacity,scale,rotate] duration-200 group-data-checked/assistant:scale-100 group-data-checked/assistant:rotate-0 group-data-checked/assistant:opacity-100 motion-reduce:transition-none"
            />
            <X
              aria-hidden="true"
              strokeWidth={3}
              className="absolute size-3.5 text-muted-foreground transition-[opacity,scale,rotate] duration-200 group-data-checked/assistant:scale-50 group-data-checked/assistant:rotate-90 group-data-checked/assistant:opacity-0 motion-reduce:transition-none"
            />
          </SwitchPrimitive.Thumb>
        </SwitchPrimitive.Root>
      )}
    </div>
  );
}
