"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ProductScreenshot } from "@/components/product-screenshot";
import { cn } from "@/lib/utils";

export type DashboardShot = {
  key: string;
  tab: string;
  title: string;
  description: string;
  name: string;
  width: number;
  height: number;
  alt: string;
};

// Une capture à la fois, en grand, plutôt que quatre réduites au point
// d'être illisibles. Onglets du motif ARIA « tabs » : flèches, Début et Fin,
// un seul onglet dans l'ordre de tabulation.
export function DashboardTabs({
  shots,
  label,
  caption,
}: {
  shots: DashboardShot[];
  label: string;
  caption: string;
}) {
  const id = useId();
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(index: number) {
    const next = (index + shots.length) % shots.length;
    setSelected(next);
    tabs.current[next]?.focus();
  }

  // Les flèches partent de l'onglet qui a reçu la touche.
  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: shots.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(moves[event.key]);
  }

  return (
    <div className="mt-10">
      <div
        role="tablist"
        aria-label={label}
        className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-fit sm:max-w-full sm:rounded-lg sm:border sm:border-border sm:bg-background sm:p-1"
      >
        {shots.map((shot, index) => (
          <button
            key={shot.key}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            id={`${id}-tab-${shot.key}`}
            type="button"
            role="tab"
            aria-selected={index === selected}
            aria-controls={`${id}-panel-${shot.key}`}
            tabIndex={index === selected ? 0 : -1}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => handleKey(event, index)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:focus-ring",
              index === selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {shot.tab}
          </button>
        ))}
      </div>

      {/* Pas de hauteur réservée : les onglets sont au-dessus des captures,
          donc rien ne bouge sous le pointeur quand la hauteur change. */}
      <div className="mt-8">
        {shots.map((shot, index) => (
          <div
            key={shot.key}
            id={`${id}-panel-${shot.key}`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${shot.key}`}
            hidden={index !== selected}
            className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12"
          >
            <div className="lg:pt-4">
              <h4 className="text-xl font-semibold tracking-tight text-foreground">{shot.title}</h4>
              <p className="mt-2 leading-relaxed text-muted-foreground">{shot.description}</p>
            </div>
            {/* Le fond occupe la colonne ; le morceau d'interface garde sa
                taille réelle, jamais agrandi (étiré, son texte deviendrait flou). */}
            <div className="min-w-0">
              <ProductScreenshot
                name={shot.name}
                width={shot.width}
                height={shot.height}
                alt={shot.alt}
                caption={caption}
                sizes={`(min-width: 1152px) ${shot.width}px, 100vw`}
                fragment
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
