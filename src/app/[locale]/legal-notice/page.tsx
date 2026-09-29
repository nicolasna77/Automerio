import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal-page";
import { legalContent } from "@/content/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageTitles");
  return { title: t("legalNotice"), alternates: { canonical: "/legal-notice" } };
}

export default async function LegalNoticePage() {
  const [t, locale] = await Promise.all([getTranslations("PageTitles"), getLocale()]);
  const { LegalNoticeContent } = legalContent(locale);
  return (
    <LegalPage title={t("legalNotice")}>
      <LegalNoticeContent />
    </LegalPage>
  );
}
