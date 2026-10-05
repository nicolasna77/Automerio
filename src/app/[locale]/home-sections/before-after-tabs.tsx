"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type BeforeAfterCase = {
  key: string;
  tab: string;
  before: string[];
  after: string[];
};

// Onglets du motif ARIA « tabs » : flèches gauche et droite, Début et Fin,
// un seul onglet dans l'ordre de tabulation (focus itinérant).
export function BeforeAfterTabs({
  cases,
  label,
  beforeTitle,
  afterTitle,
}: {
  cases: BeforeAfterCase[];
  label: string;
  beforeTitle: string;
  afterTitle: string;
}) {
  const id = useId();
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(index: number) {
    const next = (index + cases.length) % cases.length;
    setSelected(next);
    tabs.current[next]?.focus();
  }

  // Les flèches partent de l'onglet qui a reçu la touche.
  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: cases.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(moves[event.key]);
  }

  const current = cases[selected];

  return (
    <div className="mx-auto mt-10 max-w-5xl">
      <div
        role="tablist"
        aria-label={label}
        className="mx-auto flex w-fit max-w-full flex-wrap justify-center gap-1 rounded-lg border border-border bg-background p-1"
      >
        {cases.map((item, index) => (
          <button
            key={item.key}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            id={`${id}-tab-${item.key}`}
            type="button"
            role="tab"
            aria-selected={index === selected}
            aria-controls={`${id}-panel`}
            tabIndex={index === selected ? 0 : -1}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => handleKey(event, index)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:focus-ring",
              index === selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.tab}
          </button>
        ))}
      </div>

      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${current.key}`}
        className="mt-6 grid gap-4 md:grid-cols-2"
      >
        <div className="rounded-lg border border-border bg-background p-6 sm:p-8">
          <h3 className="text-base font-semibold text-muted-foreground">{beforeTitle}</h3>
          <ol className="mt-6 space-y-4">
            {current.before.map((step, index) => {
              const last = index === current.before.length - 1;
              return (
                <li key={step} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
                  >
                    {last ? (
                      <X className="size-3.5 text-destructive" />
                    ) : (
                      <span className="font-mono text-xs">{index + 1}</span>
                    )}
                  </span>
                  <span className={last ? "font-medium text-foreground" : "text-muted-foreground"}>{step}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="rounded-lg border border-primary/40 bg-card p-6 shadow-sm sm:p-8">
          <h3 className="text-base font-semibold text-primary">{afterTitle}</h3>
          <ol className="mt-6 space-y-4">
            {current.after.map((step) => (
              <li key={step} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <Check className="size-3.5" />
                </span>
                <span className="text-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
