"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Couche décorative animée qui s'arrête hors de l'écran : les traits du hero
// n'ont pas à redessiner leur zone quand personne ne les voit. Les tracés
// portent leur animation en style en ligne, d'où le `!` qui la met en pause.
export function PauseOffscreen({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-paused={visible ? undefined : ""}
      className={`${className ?? ""} data-paused:**:[animation-play-state:paused]!`}
    >
      {children}
    </div>
  );
}
