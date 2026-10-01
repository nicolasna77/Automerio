import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { FAQ_KEYS, SITE_NAME, type Faq } from "@/lib/site";
import { REFUND_GUARANTEE_DAYS } from "@/lib/legal";

export async function siteOpenGraph(
  options: { url?: string; title?: string; description?: string } = {}
): Promise<NonNullable<Metadata["openGraph"]>> {
  const t = await getTranslations("Site");
  const { url, title = t("title"), description = t("description") } = options;
  return {
    type: "website",
    locale: t("ogLocale"),
    siteName: SITE_NAME,
    title,
    description,
    ...(url ? { url } : {}),
  };
}

export async function getFaqs(locale?: Locale): Promise<Faq[]> {
  const t = await getTranslations({ locale: locale ?? (await getLocale()), namespace: "Faq.items" });
  // La durée de la garantie vient de la même constante que les CGV.
  return FAQ_KEYS.map((key) => ({
    question: t(`${key}.question`),
    answer: t(`${key}.answer`, { days: REFUND_GUARANTEE_DAYS }),
  }));
}
