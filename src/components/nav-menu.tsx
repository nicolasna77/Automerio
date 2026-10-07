"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Un seul menu de l'en-tête ouvert à la fois : celui qui s'ouvre prévient les
// autres, qui se ferment (un menu ouvert au clic resterait sinon affiché sous
// celui qu'on survole ensuite).
const NAV_MENU_OPEN = "nav-menu-open";

// Menu de l'en-tête (Solutions, « Pour qui ? ») : non modal, pour que le
// survol passe d'un menu à l'autre et que la page défile.
export function NavMenu({ children }: { children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function closeOthers(event: Event) {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    }
    window.addEventListener(NAV_MENU_OPEN, closeOthers);
    return () => window.removeEventListener(NAV_MENU_OPEN, closeOthers);
  }, [id]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) window.dispatchEvent(new CustomEvent(NAV_MENU_OPEN, { detail: id }));
  }

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={handleOpenChange}>
      {children}
    </DropdownMenu>
  );
}

// Déclencheur : s'ouvre aussi au survol, le délai de fermeture laisse le temps
// de rejoindre le panneau, et le chevron pivote tant que le menu est ouvert.
export function NavMenuTrigger({ children }: { children: ReactNode }) {
  return (
    <DropdownMenuTrigger
      openOnHover
      delay={80}
      closeDelay={150}
      className="group/trigger flex items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:focus-ring data-popup-open:text-foreground"
    >
      {children}
      <ChevronDown
        className="size-3.5 transition-transform group-data-popup-open/trigger:rotate-180 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </DropdownMenuTrigger>
  );
}
