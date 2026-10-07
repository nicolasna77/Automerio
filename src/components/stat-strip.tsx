import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Stat = {
  icon: LucideIcon;
  label: string;
  /** La donnée elle-même, en DM Mono (DESIGN.md, Typographie). */
  value: string;
  /** false pour une valeur écrite en toutes lettres (une date), en texte courant. */
  mono?: boolean;
  /** Unité en texte courant après la donnée : « € TTC/mois ». */
  unit?: string;
  note?: string | null;
};

// Bandeau de chiffres clés d'une page du tableau de bord : trois à quatre
// valeurs séparées par des filets, dans une seule carte.
export function StatStrip({ title, stats }: { title?: string; stats: Stat[] }) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle as="h2" className="text-base">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <dl className="grid grid-cols-1 divide-y divide-border sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="py-3 first:pt-0 last:pb-0 sm:px-5 sm:py-0 sm:first:pl-0 sm:last:pr-0"
            >
              <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <stat.icon className="size-4 shrink-0" aria-hidden="true" />
                {stat.label}
              </dt>
              <dd className="mt-2">
                <span
                  className={cn(
                    "text-2xl font-medium tabular-nums text-foreground sm:text-3xl",
                    stat.mono !== false && "font-mono"
                  )}
                >
                  {stat.value}
                </span>
                {stat.unit && (
                  <span className="ml-1.5 text-sm text-muted-foreground">{stat.unit}</span>
                )}
                {stat.note && (
                  <span className="mt-1 block text-xs text-muted-foreground">{stat.note}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
