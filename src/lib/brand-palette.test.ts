import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRAND_PALETTE, PALETTE_TOKENS } from "./brand-palette";

const GLOBALS = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf-8"
);

function readBlock(selector: string): Record<string, string> {
  // `\r?` : le fichier de thème peut arriver d'un éditeur Windows, en CRLF.
  const block = new RegExp(`^${selector} \\{\\r?\\n([\\s\\S]*?)^\\}`, "m").exec(
    GLOBALS
  );
  if (!block) throw new Error(`Bloc ${selector} introuvable dans globals.css`);

  const declarations: Record<string, string> = {};
  for (const [, name, value] of block[1].matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    declarations[name] = value.trim();
  }
  return declarations;
}

/** oklch() -> sRGB, la conversion que fait le navigateur avant d'afficher. */
function oklchToHex(declaration: string): string {
  const parsed = /^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)$/.exec(declaration);
  if (!parsed) throw new Error(`Valeur oklch inattendue : ${declaration}`);

  const [lightness, chroma, hue] = parsed.slice(1).map(Number);
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  return `#${linear
    .map((channel) => {
      const encoded =
        channel <= 0.0031308
          ? 12.92 * channel
          : 1.055 * channel ** (1 / 2.4) - 0.055;
      return Math.round(Math.min(1, Math.max(0, encoded)) * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

const THEMES = [
  { name: "light" as const, selector: ":root" },
  { name: "dark" as const, selector: "\\.dark" },
];

describe("BRAND_PALETTE", () => {
  it("convertit correctement une valeur connue", () => {
    expect(oklchToHex("oklch(1 0 0)")).toBe("#ffffff");
    expect(oklchToHex("oklch(0 0 0)")).toBe("#000000");
  });

  for (const theme of THEMES) {
    describe(`thème ${theme.name}`, () => {
      const declarations = readBlock(theme.selector);

      for (const [key, token] of Object.entries(PALETTE_TOKENS[theme.name])) {
        it(`${key} suit ${token}`, () => {
          const declaration = declarations[token];
          expect(declaration, `${token} absent de globals.css`).toBeDefined();
          expect(oklchToHex(declaration)).toBe(
            BRAND_PALETTE[theme.name][
              key as keyof (typeof BRAND_PALETTE)[typeof theme.name]
            ]
          );
        });
      }
    });
  }
});
