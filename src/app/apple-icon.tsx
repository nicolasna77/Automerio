import { ImageResponse } from "next/og";
import { BRAND_PALETTE } from "@/lib/brand-palette";
import { LOGO_MARK_PATH, LOGO_MARK_TRANSFORM } from "@/lib/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const ink = BRAND_PALETTE.light.primaryForeground;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_PALETTE.light.primary,
        }}
      >
        <svg width="180" height="180" viewBox="0 0 256 256">
          <path d={LOGO_MARK_PATH} transform={LOGO_MARK_TRANSFORM} fill={ink} />
        </svg>
      </div>
    ),
    size
  );
}
