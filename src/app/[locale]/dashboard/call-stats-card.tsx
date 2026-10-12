"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { CallStats } from "@/lib/call-stats";

// Carte « Activité des 30 derniers jours » d'une solution téléphonique :
// trois chiffres clés, les appels par heure (série unique, sans légende, le
// titre la nomme ; tableau équivalent pour les lecteurs d'écran) et les
// motifs les plus fréquents.
export function CallStatsCard({ stats }: { stats: CallStats }) {
  const t = useTranslations("Dashboard.service.stats");
  const format = useFormatter();
  const percent = (share: number | null) =>
    share === null ? "—" : format.number(share, { style: "percent", maximumFractionDigits: 0 });
  const hourLabel = (hour: number) => t("hour", { hour });
  const chartConfig = { count: { label: t("calls"), color: "var(--chart-1)" } } satisfies ChartConfig;
  const data = stats.byHour.map((slot) => ({ ...slot, label: hourLabel(slot.hour) }));

  const tiles: { label: string; value: string }[] = [
    { label: t("total"), value: format.number(stats.total) },
    { label: t("booked"), value: percent(stats.bookedShare) },
    ...(stats.outOfHoursShare !== null ? [{ label: t("outOfHours"), value: percent(stats.outOfHoursShare) }] : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {stats.total === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <>
            <dl className="grid gap-4 sm:grid-cols-3">
              {tiles.map((tile) => (
                // Chiffres alignés en bas : un libellé sur deux lignes ne les décale pas.
                <div key={tile.label} className="flex min-w-0 flex-col">
                  <dt className="text-sm text-muted-foreground">{tile.label}</dt>
                  <dd className="mt-auto pt-1 font-mono text-2xl font-medium tabular-nums text-foreground">{tile.value}</dd>
                </div>
              ))}
            </dl>

            <div>
              <h3 className="text-sm font-semibold text-foreground">{t("byHourTitle")}</h3>
              {stats.busiestHour !== null && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t("busiest", { from: stats.busiestHour, to: (stats.busiestHour + 1) % 24 })}
                </p>
              )}
              <ChartContainer config={chartConfig} className="mt-3 aspect-auto h-[180px] w-full" aria-hidden="true">
                <BarChart data={data} barCategoryGap={2} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval={2}
                    className="text-xs"
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideIndicator formatter={(value) => t("callsCount", { count: Number(value) })} />}
                  />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
              <table className="sr-only">
                <caption>{t("byHourTitle")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("hourColumn")}</th>
                    <th scope="col">{t("calls")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byHour
                    .filter((slot) => slot.count > 0)
                    .map((slot) => (
                      <tr key={slot.hour}>
                        <th scope="row">{hourLabel(slot.hour)}</th>
                        <td>{slot.count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {stats.topReasons.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t("reasonsTitle")}</h3>
                <ol className="mt-2 space-y-1.5 text-sm">
                  {stats.topReasons.map((entry) => (
                    <li key={entry.reason} className="flex items-baseline justify-between gap-4">
                      <span className="min-w-0 [overflow-wrap:anywhere] text-foreground">{entry.reason}</span>
                      <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                        {t("callsCount", { count: entry.count })}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
