import { ImageResponse } from "next/og";
import { OgFrame, OG_SIZE } from "@/components/og-frame";
import { priceSummary } from "@/components/json-ld";
import { getServiceBySlug } from "@/lib/get-catalog";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { formatCents } from "@/lib/catalog";

export const alt = "Automerio";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const [service, t, tPage, tCatalog] = await Promise.all([
    getServiceBySlug(slug),
    getTranslations({ locale, namespace: "OgImage" }),
    getTranslations({ locale, namespace: "ServicePage" }),
    getTranslations({ locale, namespace: "Catalog" }),
  ]);

  if (!service) {
    return new ImageResponse(
      (
        <OgFrame
          lines={["Automerio"]}
          subtitle={t("fallbackSubtitle")}
          footer="automerio.com"
        />
      ),
      size
    );
  }

  return new ImageResponse(
    (
      <OgFrame
        eyebrow={tCatalog(`categories.${service.category}`)}
        lines={[service.name]}
        subtitle={service.description}
        footer={tPage("ogFooter", {
          summary: priceSummary(service, tPage, (cents) => formatCents(cents, locale)),
        })}
      />
    ),
    size
  );
}
