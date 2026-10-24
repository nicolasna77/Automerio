"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

type Box = { x: number; y: number; width: number; height: number };

const sameBox = (a: Box | null, b: Box | null) =>
  a === b ||
  (!!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);

// Position de l'onglet choisi dans sa liste (qui porte `relative`), au
// sous-pixel près, remesurée quand la liste ou n'importe quel onglet change
// de taille : retour à la ligne, police chargée après coup qui élargit un
// voisin. `null` tant que rien n'est mesuré (rendu serveur) ou si l'onglet
// manque : l'onglet garde alors son propre fond, et la page reste juste sans
// script.
export function useTabIndicator(
  tabs: RefObject<(HTMLButtonElement | null)[]>,
  selected: number
) {
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const tab = tabs.current[selected];
    const list = tab?.parentElement;
    const measure = () => {
      let next: Box | null = null;
      if (tab && list) {
        const t = tab.getBoundingClientRect();
        const l = list.getBoundingClientRect();
        // Origine de la pastille : le bord intérieur de la liste, qui défile.
        next = {
          x: t.left - l.left - list.clientLeft + list.scrollLeft,
          y: t.top - l.top - list.clientTop + list.scrollTop,
          width: t.width,
          height: t.height,
        };
      }
      setBox((prev) => (sameBox(prev, next) ? prev : next));
    };
    measure();
    if (!list) return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const node of tabs.current) if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [tabs, selected]);

  return box;
}

// Pastille unique qui glisse vers l'onglet choisi (DESIGN.md, Mouvement) :
// 200 ms, sans rebond, coupée par « réduire les animations ». Placée avant
// les onglets dans le DOM, elle passe sous leur texte.
export function TabIndicator({ box }: { box: Box | null }) {
  if (!box) return null;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 rounded-md bg-primary transition-[transform,width,height] duration-200 ease-out motion-reduce:transition-none"
      style={{
        transform: `translate(${box.x}px, ${box.y}px)`,
        width: box.width,
        height: box.height,
      }}
    />
  );
}
