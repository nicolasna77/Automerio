import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { csvResponseHeaders, toCsv } from "@/lib/csv";
import { createLabels, type LabelTranslator } from "@/lib/labels";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const requested = (await params).locale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const [t, tLabels] = await Promise.all([
    getTranslations({ locale, namespace: "Admin.export.helpRequests" }),
    getTranslations({ locale, namespace: "Labels" }),
  ]);
  const labels = createLabels(tLabels as unknown as LabelTranslator, locale);

  const rows = await db.helpRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      user: { select: { name: true, email: true } },
      organization: { select: { name: true } },
      clientService: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" }, select: { createdAt: true, fromTeam: true } },
    },
  });

  const csv = toCsv(rows, [
    { header: t("client"), value: (r) => r.user.name },
    { header: t("email"), value: (r) => r.user.email },
    { header: t("organization"), value: (r) => r.organization?.name ?? "" },
    { header: t("service"), value: (r) => r.clientService?.name ?? "" },
    { header: t("subject"), value: (r) => r.subject },
    { header: t("message"), value: (r) => r.message },
    { header: t("status"), value: (r) => labels.helpStatus(r.status) },
    { header: t("teamReplies"), value: (r) => r.messages.filter((m) => m.fromTeam).length },
    {
      header: t("firstReplyOn"),
      value: (r) => r.messages.find((m) => m.fromTeam)?.createdAt ?? "",
    },
    { header: t("receivedOn"), value: (r) => r.createdAt },
    { header: t("resolvedOn"), value: (r) => r.resolvedAt },
  ]);

  return new Response(csv, { headers: csvResponseHeaders("demandes-aide-automerio") });
}
