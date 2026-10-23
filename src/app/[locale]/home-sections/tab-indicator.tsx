"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

type Box = { x: number; y: number; width: number; height: number };

// Position de l'onglet choisi dans sa liste (qui porte `relative`), remesurée
// quand la liste ou l'onglet change de taille : retour à la ligne, police
// chargée après coup. `null` tant que rien n'est mesuré (rendu serveur) :
// l'onglet garde alors son propre fond, et la page reste juste sans script.
export function useTabIndicator(
  tabs: RefObject<(HTMLButtonElement | null)[]>,
  selected: number
) {
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const tab = tabs.current[selected];
    if (!tab) return;
    const measure = () =>
      setBox({
        x: tab.offsetLeft,
        y: tab.offsetTop,
        width: tab.offsetWidth,
        height: tab.offsetHeight,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tab);
    if (tab.parentElement) observer.observe(tab.parentElement);
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
