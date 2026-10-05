"use client";

import { Check } from "lucide-react";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
} from "@/components/reui/stepper";
import { cn } from "@/lib/utils";

// « optional » : une étape facultative ne bloque pas la suite et n'est
// jamais l'étape en cours.
export type SetupStep = { label: string; done: boolean; optional?: boolean };

// Étapes de mise en service en frise. Chaque étape affiche son propre état :
// elles ne se terminent pas toujours dans l'ordre (agenda connecté avant le
// numéro, par exemple). L'étape en cours est la première qui reste à faire.
export function SetupStepper({ steps }: { steps: SetupStep[] }) {
  const currentIndex = steps.findIndex((step) => !step.done && !step.optional);
  const current = currentIndex === -1 ? null : steps[currentIndex];
  return (
    <div>
      {/* Sur mobile, la frise garde ses repères et cette ligne dit où l'on en est. */}
      {current && (
        <p aria-hidden="true" className="mb-3 text-sm sm:hidden">
          <span className="text-muted-foreground">
            Étape {currentIndex + 1} sur {steps.length} :{" "}
          </span>
          <span className="font-medium text-foreground">{current.label}</span>
        </p>
      )}
    <Stepper role="none" value={currentIndex === -1 ? steps.length : currentIndex + 1}>
      <StepperNav aria-label="Étapes de la mise en service" className="gap-1.5">
        {steps.map((step, index) => (
          <StepperItem
            key={step.label}
            step={index + 1}
            aria-current={index === currentIndex ? "step" : undefined}
            className="items-start"
          >
            <div className="flex min-w-0 flex-col items-start gap-1.5">
              <StepperIndicator
                // L'indicateur porte des styles par état (data-state) : on les
                // surcharge avec les mêmes variantes, sinon l'étape en cours
                // paraîtrait déjà faite.
                className={cn(
                  "size-5 border-2 text-[0.625rem]",
                  step.done
                    ? "border-transparent bg-primary text-primary-foreground data-[state=inactive]:bg-primary data-[state=inactive]:text-primary-foreground"
                    : index === currentIndex
                      ? "border-primary data-[state=active]:bg-background data-[state=active]:text-primary"
                      : step.optional
                      ? // Placée avant l'étape en cours, elle prend l'état « completed »
                        // du Stepper : on garde l'aspect d'une étape non faite.
                        "border-dashed border-border bg-transparent text-muted-foreground data-[state=completed]:bg-transparent data-[state=completed]:text-muted-foreground"
                      : "border-border bg-transparent text-muted-foreground"
                )}
              >
                {step.done ? <Check className="size-3" aria-hidden="true" /> : index + 1}
              </StepperIndicator>
              <span
                className={cn(
                  "sr-only text-xs text-balance sm:not-sr-only",
                  index === currentIndex ? "font-medium text-foreground" : step.done ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
                {step.optional && !step.done && <span className="text-muted-foreground"> (facultatif)</span>}
                <span className="sr-only">
                  {step.done ? " : fait" : index === currentIndex ? " : à faire maintenant" : step.optional ? "" : " : à venir"}
                </span>
              </span>
            </div>
            {index < steps.length - 1 && (
              <StepperSeparator className={cn("mt-2.5", step.done ? "bg-primary" : "bg-border")} />
            )}
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
    </div>
  );
}
