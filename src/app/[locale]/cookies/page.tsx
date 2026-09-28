import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal-page";
import { legalContent } from "@/content/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageTitles");
  return { title: t("cookies"), alternates: { canonical: "/cookies" } };
}

export default async function CookiesPage() {
  const [t, locale] = await Promise.all([getTranslations("PageTitles"), getLocale()]);
  const { CookiesContent, CookiesIntro } = legalContent(locale);
  return (
    <LegalPage title={t("cookies")} intro={<CookiesIntro />}>
      <CookiesContent />
    </LegalPage>
  );
}
