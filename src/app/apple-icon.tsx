import { ImageResponse } from "next/og";
import { BRAND_PALETTE } from "@/lib/brand-palette";

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
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path
            d="M9.6 21.8L16 10.2L22.4 21.8M11.48 18.4H20.52"
            fill="none"
            stroke={ink}
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M16 13.6L18.4 18.4H13.6Z" fill={ink} opacity="0.45" />
        </svg>
      </div>
    ),
    size
  );
}
