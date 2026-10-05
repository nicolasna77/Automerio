"use client";

import { useTranslations } from "next-intl";
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
import { formatEuroAmount } from "@/lib/catalog";
import { excludingVatSuffix, formatCentsWithVat } from "@/lib/vat";


export function SpendChartView({
  data,
  totalCents,
}: {
  data: { label: string; totalCents: number }[];
  totalCents: number;
}) {
  const t = useTranslations("Dashboard.overview.spend");
  const chartConfig = {
    totalCents: {
      label: t("series"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <CardTitle as="h2" className="text-base">
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {totalCents > 0 && (
            <p className="text-right">
              <span className="font-mono text-2xl font-medium tabular-nums text-foreground">
                {formatEuroAmount(totalCents)}
              </span>
              <span className="ml-1.5 text-sm text-muted-foreground">{t("unit")}</span>
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
            {t("empty")}
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
