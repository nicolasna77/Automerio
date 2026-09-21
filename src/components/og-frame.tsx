import { BRAND_GRADIENT_END, BRAND_PALETTE } from "@/lib/brand-palette";

export const OG_SIZE = { width: 1200, height: 630 };

const INK = BRAND_PALETTE.dark.background;
const PAPER = BRAND_PALETTE.dark.foreground;
const MUTED = BRAND_PALETTE.dark.mutedForeground;
const BRAND_FROM = BRAND_PALETTE.light.primary;
const BRAND_TO = BRAND_GRADIENT_END;

export function OgFrame({
  eyebrow,
  lines,
  subtitle,
  footer,
}: {
  eyebrow?: string;
  lines: string[];
  subtitle: string;
  footer: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: INK,
        color: PAPER,
        padding: 80,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${BRAND_FROM}, ${BRAND_TO})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          A
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>Automerio</div>
        {eyebrow && (
          <div style={{ fontSize: 26, color: MUTED, marginLeft: 8 }}>{`· ${eyebrow}`}</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: lines.length > 1 ? 54 : 72,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1.5,
          }}
        >
          {lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        <div style={{ fontSize: 30, color: MUTED, lineHeight: 1.4 }}>{subtitle}</div>
      </div>

      <div style={{ display: "flex", fontSize: 26, color: MUTED }}>{footer}</div>
    </div>
  );
}
