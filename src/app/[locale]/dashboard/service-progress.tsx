"use client";

import { useTranslations } from "next-intl";
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
  { status: "PENDING_PAYMENT", key: "paid" },
  { status: "CONFIGURING", key: "configuring" },
  { status: "ACTIVE", key: "active" },
] as const;

export function ServiceProgress({ status }: { status: ClientServiceStatus }) {
  const t = useTranslations("Dashboard.service.progress");
  if (status === "CANCELED") return null;

  const currentIndex = PROGRESS_STEPS.findIndex((s) => s.status === status);
  const currentStep = currentIndex + 1;

  return (
    <Stepper
      role="none"
      value={currentStep}
      indicators={{ completed: <Check className="size-3" /> }}
      className="mt-3"
    >
      <StepperNav aria-label={t("label")} className="gap-1.5">
        {PROGRESS_STEPS.map((step, index) => (
          <StepperItem
            key={step.status}
            step={index + 1}
            aria-current={index === currentIndex ? "step" : undefined}
            // La dernière étape ne rétrécit pas sous son libellé.
            className="items-start last:shrink-0"
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
                {t(step.key)}
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
