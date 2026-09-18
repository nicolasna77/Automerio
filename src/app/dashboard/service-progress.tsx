import { cn } from "@/lib/utils";
import type { ClientServiceStatus } from "@/lib/catalog";

const PROGRESS_STEPS = [
  { status: "PENDING_PAYMENT", label: "Payé" },
  { status: "CONFIGURING", label: "En configuration" },
  { status: "ACTIVE", label: "Actif" },
] as const;

export function ServiceProgress({ status }: { status: ClientServiceStatus }) {
  if (status === "CANCELED") return null;
  const currentIndex = PROGRESS_STEPS.findIndex((s) => s.status === status);

  return (
    <ol aria-label="Étapes de la solution" className="mt-3 flex items-center">
      {PROGRESS_STEPS.map((step, index) => {
        const done = index <= currentIndex;
        const current = index === currentIndex;
        return (
          <li
            key={step.status}
            aria-current={current ? "step" : undefined}
            className="flex flex-1 items-center last:flex-none"
          >
            <div className="flex flex-col items-start gap-1">
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full border",
                  done
                    ? "border-primary bg-primary"
                    : "border-border bg-transparent",
                  current && "ring-2 ring-primary/25"
                )}
              />
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  current
                    ? "font-medium text-foreground"
                    : done
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < PROGRESS_STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "mx-1.5 mb-4 h-px flex-1",
                  index < currentIndex ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
