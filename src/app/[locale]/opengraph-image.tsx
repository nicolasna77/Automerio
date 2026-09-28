import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { OgFrame, OG_SIZE } from "@/components/og-frame";

export const alt = "Automerio";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "OgImage" });
  return new ImageResponse(
    (
      <OgFrame
        lines={[t("homeLine1"), t("homeLine2")]}
        subtitle={t("homeSubtitle")}
        footer={t("homeFooter")}
      />
    ),
    size
  );
}
