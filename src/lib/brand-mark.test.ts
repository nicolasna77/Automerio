import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOGO_MARK_PATH, LOGO_MARK_TRANSFORM, LOGO_TILE_RADIUS } from "./brand-mark";

// Le favicon et la bannière Facebook sont des fichiers figés qui ne peuvent
// pas importer brand-mark.ts : ils recopient le tracé. Ce test empêche les
// copies de dériver quand on retouche le logo.
const COPIES = ["src/app/icon.svg", "assets/banners/site-promise/facebook-cover.html"];

describe.each(COPIES)("%s", (file) => {
  const source = readFileSync(file, "utf8");

  it("reprend le tracé, la mise en place et l'arrondi du logo", () => {
    expect(source).toContain(`d="${LOGO_MARK_PATH}"`);
    expect(source).toContain(`transform="${LOGO_MARK_TRANSFORM}"`);
    expect(source).toContain(`rx="${LOGO_TILE_RADIUS}"`);
  });
});
