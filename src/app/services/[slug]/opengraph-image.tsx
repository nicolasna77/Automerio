import { ImageResponse } from "next/og";
import { OgFrame, OG_SIZE } from "@/components/og-frame";
import { priceSummary } from "@/components/json-ld";
import { getServiceBySlug } from "@/lib/get-catalog";
import { CATEGORY_LABELS } from "@/lib/catalog";

export const alt = "Une solution Automerio";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);

  if (!service) {
    return new ImageResponse(
      (
        <OgFrame
          lines={["Automerio"]}
          subtitle="Des automatisations installées, connectées et surveillées par notre équipe."
          footer="automerio.com"
        />
      ),
      size
    );
  }

  return new ImageResponse(
    (
      <OgFrame
        eyebrow={CATEGORY_LABELS[service.category]}
        lines={[service.name]}
        subtitle={service.description}
        footer={`${priceSummary(service)} Sans engagement.`}
      />
    ),
    size
  );
}
