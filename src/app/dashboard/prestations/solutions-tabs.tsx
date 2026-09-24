"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CATALOGUE_PATH, MY_SOLUTIONS_PATH } from "./paths";

/**
 * Deux vues d'une meme entree de menu : ce que le client a deja, et ce qu'il
 * peut ajouter. Des liens plutot que des onglets ARIA : chaque vue a sa propre
 * URL, se partage, et le bouton retour du navigateur fait ce qu'on attend.
 */
export function SolutionsTabs({ myCount }: { myCount: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: MY_SOLUTIONS_PATH, label: "Mes solutions", count: myCount },
    { href: CATALOGUE_PATH, label: "Catalogue", count: null },
  ];

  return (
    <nav aria-label="Solutions" className="mb-8">
      <ul className="inline-flex gap-1 rounded-full bg-muted p-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isActive && "bg-background text-foreground shadow-sm"
                )}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="rounded-full bg-foreground/10 px-1.5 text-xs tabular-nums">
                    {tab.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
