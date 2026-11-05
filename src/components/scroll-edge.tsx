"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Filet sous un en-tête collant (DESIGN.md, Mouvement) : absent tout en haut
// de la page, il apparaît en fondu dès que le contenu passe sous l'en-tête.
// À placer en dernier enfant d'un en-tête en `sticky` (donc positionné).
// Sans JavaScript, le filet reste visible.
export function ScrollEdge({ className }: { className?: string }) {
  const [atTop, setAtTop] = useState(false);

  useEffect(() => {
    const update = () => setAtTop(window.scrollY <= 0);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border transition-opacity duration-150 ease-out",
        // Contraste élevé : le filet reste toujours visible.
        atTop && "opacity-0 contrast-more:opacity-100",
        className
      )}
    />
  );
}
