"use client";

import { useEffect } from "react";

// Un lien vers la section déjà dans l'adresse (on clique « FAQ », on remonte,
// on reclique « FAQ ») ne fait rien : l'URL ne change pas, donc le routeur ne
// navigue pas. On fait alors défiler jusqu'à la section nous-mêmes ; le
// défilement doux et son arrêt par « réduire les animations » viennent du CSS
// (`motion-safe:scroll-smooth` sur <html>), le décalage sous l'en-tête des
// `scroll-mt-*` des sections.
export function SameHashScroll() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = new URL(anchor.href, window.location.href);
      if (
        !url.hash ||
        url.origin !== window.location.origin ||
        url.pathname !== window.location.pathname ||
        url.hash !== window.location.hash
      ) {
        return;
      }
      document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({ block: "start" });
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
