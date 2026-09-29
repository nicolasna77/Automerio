import { PhoneCall, Wallet, Zap } from "lucide-react";
import { StatStrip, type Stat } from "@/components/stat-strip";
import { db } from "@/lib/db";
import { formatEuroAmount } from "@/lib/catalog";
import { excludingVatSuffix } from "@/lib/vat";

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

  const stats: Stat[] = [
    {
      icon: Zap,
      label: "Solutions actives",
      value: String(activeServices.length),
      note: settingUpNote,
    },
    {
      icon: Wallet,
      label: "Dépense mensuelle",
      value: formatEuroAmount(monthlySpendCents),
      unit: "€ TTC/mois",
      note: [
        excludingVatSuffix(monthlySpendCents),
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

  return <StatStrip title="Ce mois-ci" stats={stats} />;
}
