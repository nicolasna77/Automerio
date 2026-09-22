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

/** hsl() -> sRGB, la conversion que fait le navigateur avant d'afficher. */
function hslToHex(declaration: string): string {
  const parsed = /^hsl\(([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\)$/.exec(declaration.trim());
  if (!parsed) throw new Error(`Valeur hsl inattendue : ${declaration}`);

  const [hue, saturation, lightness] = parsed.slice(1).map(Number);
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const offset = l - chroma / 2;

  const [r, g, b] = [
    [chroma, second, 0],
    [second, chroma, 0],
    [0, chroma, second],
    [0, second, chroma],
    [second, 0, chroma],
    [chroma, 0, second],
  ][Math.floor(hue / 60) % 6];

  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel + offset) * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}

const THEMES = [
  { name: "light" as const, selector: ":root" },
  { name: "dark" as const, selector: "\\.dark" },
];

describe("BRAND_PALETTE", () => {
  it("convertit correctement une valeur connue", () => {
    expect(hslToHex("hsl(0 0% 100%)")).toBe("#ffffff");
    expect(hslToHex("hsl(0 0% 0%)")).toBe("#000000");
    expect(hslToHex("hsl(180.7595 47.3054% 32.7451%)")).toBe("#2c7a7b");
  });

  for (const theme of THEMES) {
    describe(`thème ${theme.name}`, () => {
      const declarations = readBlock(theme.selector);

      for (const [key, token] of Object.entries(PALETTE_TOKENS[theme.name])) {
        it(`${key} suit ${token}`, () => {
          const declaration = declarations[token];
          expect(declaration, `${token} absent de globals.css`).toBeDefined();
          expect(hslToHex(declaration)).toBe(
            BRAND_PALETTE[theme.name][
              key as keyof (typeof BRAND_PALETTE)[typeof theme.name]
            ]
          );
        });
      }
    });
  }
});
