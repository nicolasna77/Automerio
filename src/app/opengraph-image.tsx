import { ImageResponse } from "next/og";
import { OgFrame, OG_SIZE } from "@/components/og-frame";

export const alt = "Automerio — automatisations installées, connectées et surveillées";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame
        lines={["Votre entreprise tourne.", "Vos automatisations s'occupent du reste."]}
        subtitle="Standard téléphonique, messagerie, documents administratifs — installés, connectés et surveillés par notre équipe."
        footer="Pour les artisans, coachs, indépendants et TPE/PME en France"
      />
    ),
    size
  );
}
