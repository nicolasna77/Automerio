import { Building2, Users, Zap, Wallet, Clock3 } from "lucide-react";
import { Card, CardHeader, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { db } from "@/lib/db";
import { STATUS_LABELS, formatPrice, type ClientServiceStatus } from "@/lib/catalog";
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

function formatDelta(delta: number, suffix: string) {
  if (delta === 0) return null;
  return `${delta > 0 ? "+" : ""}${delta} ${suffix}`;
}

function Sparkline({ counts }: { counts: number[] }) {
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
      aria-label={`Activations des ${SPARKLINE_DAYS} derniers jours : ${counts.join(", ")}`}
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
        <StatCard icon={Users} label="Clients" value={clientCount}>
          {formatDelta(newClientsLast7d, "cette semaine") && (
            <p className="text-xs text-muted-foreground">
              {formatDelta(newClientsLast7d, "cette semaine")}
            </p>
          )}
        </StatCard>
        <StatCard icon={Zap} label="Automatisations actives" value={activeCount}>
          {formatDelta(activatedLast7d, "activées cette semaine") && (
            <p className="text-xs text-muted-foreground">
              {formatDelta(activatedLast7d, "activées cette semaine")}
            </p>
          )}
        </StatCard>
        <StatCard
          icon={Wallet}
          label="Revenu récurrent mensuel"
          value={
            <>
              {formatPrice(mrrCents)} TTC
              <span className="block text-xs font-normal text-muted-foreground">
                soit {formatPriceExcludingVat(mrrCents)} HT
              </span>
            </>
          }
        >
          <Sparkline counts={sparklineCounts} />
        </StatCard>
        <Card>
          <CardHeader>
            <div className="mb-1 flex items-center justify-between">
              <CardDescription>Répartition par statut</CardDescription>
              <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <dl className="space-y-1">
              {STATUS_ORDER.map((status) => (
                <div key={status} className="flex items-center justify-between gap-2 text-sm">
                  <dt className="text-muted-foreground">{STATUS_LABELS[status]}</dt>
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
        Basé sur {clientCount} client{clientCount > 1 ? "s" : ""} et{" "}
        {activeCount} automatisation{activeCount > 1 ? "s" : ""} active
        {activeCount > 1 ? "s" : ""}.
      </p>
    </div>
  );
}
