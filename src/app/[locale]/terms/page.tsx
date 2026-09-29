import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal-page";
import { legalContent } from "@/content/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageTitles");
  return { title: t("terms"), alternates: { canonical: "/terms" } };
}

export default async function TermsPage() {
  const [t, locale] = await Promise.all([getTranslations("PageTitles"), getLocale()]);
  const { TermsContent, TermsIntro } = legalContent(locale);
  return (
    <LegalPage title={t("terms")} intro={<TermsIntro />}>
      <TermsContent />
    </LegalPage>
  );
}
