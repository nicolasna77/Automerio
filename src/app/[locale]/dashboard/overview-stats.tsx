import { getTranslations } from "next-intl/server";
import { getPriceFormatter } from "@/lib/price-format-server";
import { PhoneCall, Wallet, Zap } from "lucide-react";
import { StatStrip, type Stat } from "@/components/stat-strip";
import { db } from "@/lib/db";
import { formatEuroAmount } from "@/lib/catalog";

export async function OverviewStats({ organizationId }: { organizationId: string }) {
  const t = await getTranslations("Dashboard.overview.stats");
  const price = await getPriceFormatter();
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

  const settingUpNote = settingUpCount > 0 ? t("settingUp", { count: settingUpCount }) : null;

  const stats: Stat[] = [
    {
      icon: Zap,
      label: t("activeServices"),
      value: String(activeServices.length),
      note: settingUpNote,
    },
    {
      icon: Wallet,
      label: t("monthlySpend"),
      value: formatEuroAmount(monthlySpendCents),
      unit: t("perMonthUnit"),
      note: [
        price.excludingVatSuffix(monthlySpendCents),
        settingUpNote ? t("excludingSettingUp") : null,
      ]
        .filter((part): part is string => part !== null)
        .join(" · "),
    },
    {
      icon: PhoneCall,
      label: t("callsThisMonth"),
      value: String(callsThisMonth),
      note: null,
    },
  ];

  return <StatStrip title={t("title")} stats={stats} />;
}
