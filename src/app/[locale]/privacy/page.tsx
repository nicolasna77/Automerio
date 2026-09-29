import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal-page";
import { legalContent } from "@/content/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageTitles");
  return { title: t("privacy"), alternates: { canonical: "/privacy" } };
}

export default async function PrivacyPage() {
  const [t, locale] = await Promise.all([getTranslations("PageTitles"), getLocale()]);
  const { PrivacyContent, PrivacyIntro } = legalContent(locale);
  return (
    <LegalPage title={t("privacy")} intro={<PrivacyIntro />}>
      <PrivacyContent />
    </LegalPage>
  );
}
