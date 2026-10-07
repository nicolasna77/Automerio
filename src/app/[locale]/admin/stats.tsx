import { Building2, Users, Zap, Wallet, Clock3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardHeader, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { db } from "@/lib/db";
import { formatPrice, type ClientServiceStatus } from "@/lib/catalog";
import { getLabels } from "@/lib/labels-server";
import { formatPriceExcludingVat } from "@/lib/vat";

const STATUS_ORDER: ClientServiceStatus[] = [
  "PENDING_PAYMENT",
  "CONFIGURING",
  "ACTIVE",
  "CANCELED",
];

const SPARKLINE_DAYS = 14;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function signedDelta(delta: number) {
  return `${delta > 0 ? "+" : ""}${delta}`;
}

function Sparkline({ counts, label }: { counts: number[]; label: string }) {
  const max = Math.max(1, ...counts);
  const width = 120;
  const height = 28;
  const step = width / Math.max(1, counts.length - 1);
  const points = counts
    .map((count, i) => {
      const x = i * step;
      const y = height - (count / max) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-7 w-full text-primary"
      role="img"
      aria-label={label}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export async function Stats() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sparklineStart = startOfDay(
    new Date(now.getTime() - (SPARKLINE_DAYS - 1) * 24 * 60 * 60 * 1000)
  );

  const [
    clientCount,
    newClientsLast7d,
    activeServices,
    statusCounts,
    activatedLast7d,
    dailyActivations,
    t,
    labels,
  ] = await Promise.all([
    db.user.count({ where: { role: { not: "ADMIN" } } }),
    db.user.count({
      where: { role: { not: "ADMIN" }, createdAt: { gte: sevenDaysAgo } },
    }),
    db.clientService.findMany({
      where: { status: "ACTIVE" },
      include: { service: true },
    }),
    db.clientService.groupBy({ by: ["status"], _count: true }),
    db.clientService.count({ where: { activatedAt: { gte: sevenDaysAgo } } }),
    db.$queryRaw<{ day: Date; count: number }[]>`
      SELECT date_trunc('day', "activatedAt") AS day, COUNT(*)::int AS count
      FROM client_service
      WHERE "activatedAt" >= ${sparklineStart}
      GROUP BY day
      ORDER BY day ASC
    `,
    getTranslations("Admin"),
    getLabels(),
  ]);

  const activeCount = activeServices.length;
  const mrrCents = activeServices.reduce(
    (sum, cs) => sum + (cs.service.monthlyPriceCents ?? 0),
    0
  );

  const countByStatus = new Map(
    statusCounts.map((row) => [row.status, row._count])
  );
  const countByDay = new Map(
    dailyActivations.map((row) => [
      startOfDay(new Date(row.day)).getTime(),
      Number(row.count),
    ])
  );
  const sparklineCounts = Array.from({ length: SPARKLINE_DAYS }, (_, i) => {
    const day = new Date(
      sparklineStart.getFullYear(),
      sparklineStart.getMonth(),
      sparklineStart.getDate() + i
    );
    return countByDay.get(day.getTime()) ?? 0;
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label={t("stats.clients")} value={clientCount}>
          {newClientsLast7d !== 0 && (
            <p className="text-xs text-muted-foreground">
              {t("stats.newThisWeek", { delta: signedDelta(newClientsLast7d) })}
            </p>
          )}
        </StatCard>
        <StatCard icon={Zap} label={t("stats.activeAutomations")} value={activeCount}>
          {activatedLast7d !== 0 && (
            <p className="text-xs text-muted-foreground">
              {t("stats.activatedThisWeek", { delta: signedDelta(activatedLast7d) })}
            </p>
          )}
        </StatCard>
        <StatCard
          icon={Wallet}
          label={t("stats.mrr")}
          value={
            <>
              {t("price.withVat", { amount: formatPrice(mrrCents) })}
              <span className="block text-xs font-normal text-muted-foreground">
                {t("price.excludingVat", { amount: formatPriceExcludingVat(mrrCents) })}
              </span>
            </>
          }
        >
          <Sparkline
            counts={sparklineCounts}
            label={t("stats.sparkline", { days: SPARKLINE_DAYS, counts: sparklineCounts.join(", ") })}
          />
        </StatCard>
        <Card>
          <CardHeader>
            <div className="mb-1 flex items-center justify-between">
              <CardDescription>{t("stats.byStatus")}</CardDescription>
              <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <dl className="space-y-1">
              {STATUS_ORDER.map((status) => (
                <div key={status} className="flex items-center justify-between gap-2 text-sm">
                  <dt className="text-muted-foreground">{labels.status(status)}</dt>
                  <dd className="font-mono tabular-nums text-foreground">
                    {countByStatus.get(status) ?? 0}
                  </dd>
                </div>
              ))}
            </dl>
          </CardHeader>
        </Card>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Building2 className="size-3.5" aria-hidden="true" />
        {t("stats.basedOn", { clients: clientCount, active: activeCount })}
      </p>
    </div>
  );
}
