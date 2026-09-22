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
import type { ClientServiceStatus } from "@/lib/catalog";

const PROGRESS_STEPS = [
  { status: "PENDING_PAYMENT", label: "Payé" },
  { status: "CONFIGURING", label: "En configuration" },
  { status: "ACTIVE", label: "Actif" },
] as const;

/**
 * Ou en est une solution, de son paiement a sa mise en service.
 *
 * Volontairement sans `StepperTrigger` ni `StepperTitle`. Le premier rendrait
 * des boutons qui ne menent nulle part : rien n'est navigable ici, l'etape
 * courante est decidee par le statut de la solution. Le second rend un `<h3>`,
 * et ce composant se repete a chaque ligne de la liste des solutions — trois
 * titres par ligne encombreraient le plan de la page sans rien nommer.
 */
export function ServiceProgress({ status }: { status: ClientServiceStatus }) {
  if (status === "CANCELED") return null;

  const currentIndex = PROGRESS_STEPS.findIndex((s) => s.status === status);
  const currentStep = currentIndex + 1;

  return (
    <Stepper
      value={currentStep}
      indicators={{ completed: <Check className="size-3" /> }}
      className="mt-3"
    >
      <StepperNav aria-label="Étapes de la solution" className="gap-1.5">
        {PROGRESS_STEPS.map((step, index) => (
          <StepperItem
            key={step.status}
            step={index + 1}
            aria-current={index === currentIndex ? "step" : undefined}
            className="items-start"
          >
            <div className="flex flex-col items-start gap-1.5">
              <StepperIndicator className="size-4 border-2 border-transparent text-[0.625rem] data-[state=inactive]:border-border data-[state=inactive]:bg-transparent" />
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  index === currentIndex
                    ? "font-medium text-foreground"
                    : index < currentIndex
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < PROGRESS_STEPS.length - 1 && (
              <StepperSeparator className="mt-2 data-[state=completed]:bg-primary" />
            )}
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  );
}
