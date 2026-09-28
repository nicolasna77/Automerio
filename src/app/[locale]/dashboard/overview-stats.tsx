import { PhoneCall, Wallet, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/catalog";
import { formatPriceExcludingVat } from "@/lib/vat";

export async function OverviewStats({ organizationId }: { organizationId: string }) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeServices, settingUpCount, callsThisMonth] = await Promise.all([
    db.clientService.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: { service: { select: { monthlyPriceCents: true } } },
    }),
    db.clientService.count({
      where: { organizationId, status: { in: ["PENDING_PAYMENT", "CONFIGURING"] } },
    }),
    db.usageEvent.count({
      where: {
        clientService: { organizationId },
        type: "call",
        status: "completed",
        occurredAt: { gte: periodStart },
      },
    }),
  ]);

  const monthlySpendCents = activeServices.reduce(
    (sum, cs) => sum + (cs.service.monthlyPriceCents ?? 0),
    0
  );

  const settingUpNote =
    settingUpCount > 0
      ? `+ ${settingUpCount} en cours d'installation`
      : null;

  const stats = [
    {
      icon: Zap,
      label: "Solutions actives",
      value: String(activeServices.length),
      note: settingUpNote,
    },
    {
      icon: Wallet,
      label: "Dépense mensuelle",
      value: `${formatPrice(monthlySpendCents)} TTC`,
      note: [
        `soit ${formatPriceExcludingVat(monthlySpendCents)} HT`,
        settingUpNote ? "hors solutions en cours d'installation" : null,
      ]
        .filter((part): part is string => part !== null)
        .join(" · "),
    },
    {
      icon: PhoneCall,
      label: "Appels ce mois-ci",
      value: String(callsThisMonth),
      note: null,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">Ce mois-ci</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="py-3 first:pt-0 sm:px-5 sm:py-0 sm:first:pt-0 sm:first:pl-0 sm:last:pr-0"
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <stat.icon className="size-3.5 shrink-0" aria-hidden="true" />
                {stat.label}
              </div>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">
                {stat.value}
              </p>
              {stat.note && (
                <p className="mt-0.5 text-xs text-muted-foreground">{stat.note}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
