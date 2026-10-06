import { getTranslations } from "next-intl/server";
import { getPriceFormatter } from "@/lib/price-format-server";
import { MessageSquareText, PhoneCall, Wallet, Zap } from "lucide-react";
import { StatStrip, type Stat } from "@/components/stat-strip";
import { db } from "@/lib/db";
import { formatEuroAmount, MESSAGING_SERVICE_SLUGS, TELEPHONY_SERVICE_SLUGS } from "@/lib/catalog";

export async function OverviewStats({ organizationId }: { organizationId: string }) {
  const t = await getTranslations("Dashboard.overview.stats");
  const price = await getPriceFormatter();
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeServices, settingUpCount, callsThisMonth, repliesThisMonth] = await Promise.all([
    db.clientService.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: {
        monthlyPriceCents: true,
        service: { select: { slug: true, monthlyPriceCents: true } },
      },
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
    db.conversationMessage.count({
      where: {
        direction: "OUTBOUND",
        createdAt: { gte: periodStart },
        conversation: { clientService: { organizationId } },
      },
    }),
  ]);

  // Le prix payé : celui du volume choisi par le client, à défaut celui du
  // catalogue (abonnements souscrits avant le choix du volume).
  const monthlySpendCents = activeServices.reduce(
    (sum, cs) => sum + (cs.monthlyPriceCents ?? cs.service.monthlyPriceCents ?? 0),
    0
  );
  const hasTelephony = activeServices.some((cs) => TELEPHONY_SERVICE_SLUGS.has(cs.service.slug));
  const hasMessaging = activeServices.some((cs) => MESSAGING_SERVICE_SLUGS.has(cs.service.slug));

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
    // L'activité des solutions que le client a vraiment : appels pour la
    // téléphonie, réponses envoyées pour les messageries.
    ...(hasTelephony || callsThisMonth > 0
      ? [{ icon: PhoneCall, label: t("callsThisMonth"), value: String(callsThisMonth), note: null }]
      : []),
    ...(hasMessaging || repliesThisMonth > 0
      ? [{ icon: MessageSquareText, label: t("repliesThisMonth"), value: String(repliesThisMonth), note: null }]
      : []),
  ];

  return <StatStrip title={t("title")} stats={stats} />;
}
