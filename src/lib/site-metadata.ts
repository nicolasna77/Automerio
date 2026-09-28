import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { FAQ_KEYS, SITE_NAME, type Faq } from "@/lib/site";

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
  return FAQ_KEYS.map((key) => ({ question: t(`${key}.question`), answer: t(`${key}.answer`) }));
}
