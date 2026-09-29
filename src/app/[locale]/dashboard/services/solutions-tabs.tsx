"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CATALOGUE_PATH, MY_SOLUTIONS_PATH } from "./paths";

// Onglets soulignés sur un filet : la pilule arrondie est réservée à ce qui
// est rond par nature (DESIGN.md, « Formes »).
export function SolutionsTabs({ myCount }: { myCount: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: MY_SOLUTIONS_PATH, label: "Mes solutions", count: myCount },
    { href: CATALOGUE_PATH, label: "Catalogue", count: null },
  ];

  return (
    <nav aria-label="Solutions" className="mb-6 border-b border-border">
      <ul className="-mb-px flex gap-6">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center gap-2 border-b-2 border-transparent text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isActive && "border-primary text-foreground"
                )}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="rounded-sm bg-muted px-1.5 font-mono text-xs tabular-nums text-muted-foreground">
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
