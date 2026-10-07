import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { csvResponseHeaders, toCsv } from "@/lib/csv";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const requested = (await params).locale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Admin.export.waitlist" });

  const rows = await db.waitlistEntry.findMany({ orderBy: { createdAt: "desc" } });
  const csv = toCsv(rows, [
    { header: t("email"), value: (r) => r.email },
    { header: t("name"), value: (r) => r.name },
    { header: t("company"), value: (r) => r.company },
    { header: t("phone"), value: (r) => r.phone },
    { header: t("wantsCallback"), value: (r) => (r.wantsCallback ? t("yes") : t("no")) },
    { header: t("wantsNewsletter"), value: (r) => (r.wantsNewsletter ? t("yes") : t("no")) },
    { header: t("newsletterConsentOn"), value: (r) => r.newsletterConsentAt },
    { header: t("signedUpOn"), value: (r) => r.createdAt },
  ]);

  return new Response(csv, { headers: csvResponseHeaders("liste-attente-automerio") });
}
