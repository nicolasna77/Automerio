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

const chartConfig = {
  totalCents: {
    label: "Dépense",
    color: "var(--primary)",
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
            <CardTitle className="text-base">
              Dépenses des 6 derniers mois
            </CardTitle>
            <CardDescription>Basé sur vos factures payées.</CardDescription>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {formatCents(totalCents)}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {totalCents === 0 ? (
          <div className="flex h-[240px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border px-6 text-center">
            <p className="font-medium text-foreground">
              Aucune facture payée pour l&apos;instant
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Vos dépenses apparaîtront ici dès le premier prélèvement, mois par
              mois.
            </p>
          </div>
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
                  formatter={(value) => formatCents(Number(value))}
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
                {bucket.label} : {formatCents(bucket.totalCents)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
