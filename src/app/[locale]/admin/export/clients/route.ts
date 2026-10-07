import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { csvResponseHeaders, toCsv } from "@/lib/csv";
import { formatCents, type ClientServiceStatus } from "@/lib/catalog";
import { createLabels, type LabelTranslator } from "@/lib/labels";
import { formatCentsExcludingVat } from "@/lib/vat";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const requested = (await params).locale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const [t, tLabels] = await Promise.all([
    getTranslations({ locale, namespace: "Admin.export.clients" }),
    getTranslations({ locale, namespace: "Labels" }),
  ]);
  const labels = createLabels(tLabels as unknown as LabelTranslator, locale);

  const rows = await db.clientService.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      service: true,
      organization: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });

  const csv = toCsv(rows, [
    { header: t("client"), value: (r) => r.user.name },
    { header: t("email"), value: (r) => r.user.email },
    { header: t("organization"), value: (r) => r.organization.name },
    { header: t("service"), value: (r) => r.service.name },
    { header: t("activationName"), value: (r) => r.name },
    {
      header: t("status"),
      value: (r) => labels.status(r.status as ClientServiceStatus),
    },
    {
      header: t("monthlyWithVat"),
      value: (r) =>
        r.service.monthlyPriceCents === null
          ? ""
          : formatCents(r.service.monthlyPriceCents),
    },
    {
      header: t("monthlyExcludingVat"),
      value: (r) =>
        r.service.monthlyPriceCents === null
          ? ""
          : formatCentsExcludingVat(r.service.monthlyPriceCents),
    },
    { header: t("promoCode"), value: (r) => r.promoCode },
    { header: t("phoneNumber"), value: (r) => r.externalPhoneNumber },
    { header: t("note"), value: (r) => r.adminNote },
    { header: t("requestedOn"), value: (r) => r.createdAt },
    { header: t("activatedOn"), value: (r) => r.activatedAt },
    { header: t("canceledOn"), value: (r) => r.canceledAt },
  ]);

  return new Response(csv, { headers: csvResponseHeaders("clients-automerio") });
}
