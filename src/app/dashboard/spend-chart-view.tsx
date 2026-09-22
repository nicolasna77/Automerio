"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCents } from "@/lib/catalog";
import { excludingVatSuffix, formatCentsWithVat } from "@/lib/vat";

const chartConfig = {
  totalCents: {
    label: "Dépense",
    // `--chart-1` plutot que `--primary` : le theme distingue la palette des
    // graphiques de la couleur de marque, meme si les deux coincident pour
    // l'instant. Le graphique suivra si elles divergent.
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function SpendChartView({
  data,
  totalCents,
}: {
  data: { label: string; totalCents: number }[];
  totalCents: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <CardTitle as="h2" className="text-base">
              Dépenses des 6 derniers mois
            </CardTitle>
            <CardDescription>Basé sur vos factures payées.</CardDescription>
          </div>
          {totalCents > 0 && (
            <p className="text-right text-2xl font-semibold tabular-nums text-foreground">
              {formatCents(totalCents)} TTC
              <span className="block text-xs font-normal text-muted-foreground">
                {excludingVatSuffix(totalCents)}
              </span>
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {totalCents === 0 ? (
          <p className="text-sm text-muted-foreground">
            Vos dépenses apparaîtront ici dès le premier prélèvement, mois par
            mois.
          </p>
        ) : (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[240px] w-full"
          aria-hidden="true"
        >
          <BarChart data={data}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCentsWithVat(Number(value))}
                />
              }
            />
            <Bar
              dataKey="totalCents"
              fill="var(--color-totalCents)"
              radius={2}
              maxBarSize={40}
            />
          </BarChart>
        </ChartContainer>
        )}
        {totalCents > 0 && (
          <ul className="sr-only">
            {data.map((bucket) => (
              <li key={bucket.label}>
                {bucket.label} : {formatCentsWithVat(bucket.totalCents)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
