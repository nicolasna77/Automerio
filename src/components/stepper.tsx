import { useTranslations } from "next-intl";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepperStep = {
  title: string;
  description?: string;
  icon: LucideIcon;
};

// Au-delà, les descriptions sont masquées et, sur mobile, les titres aussi :
// une ligne « Étape 3 sur 7 : Horaires » les remplace sous les pastilles.
const COMPACT_FROM = 5;

// Étapes d'un parcours : pastille à icône, filet de progression, titre et
// description. Seules des transitions de couleur, sans ressort ni
// agrandissement (DESIGN.md, Mouvement). Une étape terminée se rouvre au clic
// quand `onStepClick` est fourni ; on ne saute jamais une étape à venir.
export function Stepper({
  steps,
  current,
  onStepClick,
  label,
}: {
  steps: StepperStep[];
  current: number;
  onStepClick?: (index: number) => void;
  label: string;
}) {
  const t = useTranslations("Common");
  const compact = steps.length >= COMPACT_FROM;

  return (
    <div>
      <ol aria-label={label} className="flex w-full items-start">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const clickable = done && onStepClick !== undefined;
          const Icon = done ? Check : step.icon;

          const marker = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex size-9 items-center justify-center rounded-full border transition-colors duration-150 motion-reduce:transition-none",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15",
                  !done && !active && "border-border bg-card text-muted-foreground"
                )}
              >
                <Icon className="size-4" strokeWidth={done ? 2.5 : 2} />
              </span>
              <span
                className={cn(
                  "mt-3 space-y-0.5 px-1 text-center",
                  compact ? "sr-only sm:not-sr-only sm:block" : "block"
                )}
              >
                <span
                  className={cn(
                    "block transition-colors duration-150 motion-reduce:transition-none",
                    compact ? "text-xs leading-snug" : "text-sm",
                    active || done ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="sr-only">
                    {t("stepPrefix", {
                      step: t(done ? "stepOfDone" : "stepOf", { current: index + 1, total: steps.length }),
                    })}
                  </span>
                  {step.title}
                </span>
                {step.description && !compact && (
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {step.description}
                  </span>
                )}
              </span>
            </>
          );

          return (
            <li
              key={step.title}
              aria-current={active ? "step" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center"
            >
              {/* Filet du centre de cette pastille au centre de la suivante. */}
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-[17px] left-1/2 h-0.5 w-full transition-colors duration-150 motion-reduce:transition-none",
                    done ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick(index)}
                  className="flex flex-col items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {marker}
                </button>
              ) : (
                <div className="flex flex-col items-center">{marker}</div>
              )}
            </li>
          );
        })}
      </ol>

      {compact && steps[current] && (
        <p aria-hidden="true" className="mt-4 text-center text-sm sm:hidden">
          <span className="text-muted-foreground">
            {t("stepPrefix", { step: t("stepOf", { current: current + 1, total: steps.length }) })}
          </span>
          <span className="font-medium text-foreground">{steps[current].title}</span>
        </p>
      )}
    </div>
  );
}
