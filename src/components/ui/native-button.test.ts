import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Composants Base UI qui attendent un vrai <button> par défaut : rendus en
// lien (render={<a />} ou <Link />), ils doivent recevoir nativeButton={false},
// sinon Base UI le signale en console et le lien perd sa sémantique (CLAUDE.md).
// SidebarMenuButton n'en fait pas partie : il passe par useRender, sans
// nativeButton.
const BUTTON_LIKE = [
  "Button",
  "SheetClose",
  "DialogClose",
  "AlertDialogAction",
  "AlertDialogCancel",
  "DropdownMenuTrigger",
  "PopoverTrigger",
  "DialogTrigger",
  "AlertDialogTrigger",
];
const NON_BUTTON = ["a", "Link", "span", "div", "label"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

// Balise ouvrante complète, de « <Button » jusqu'au « > » qui la ferme, en
// sautant les accolades (le JSX passé à render en contient lui-même).
function openingTag(source: string, start: number): string {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (char === "{") depth++;
    else if (char === "}") depth--;
    else if (char === ">" && depth === 0 && source[i - 1] !== "=") return source.slice(start, i + 1);
  }
  return source.slice(start);
}

export function findMissingNativeButton(source: string): string[] {
  const tag = new RegExp(`<(${BUTTON_LIKE.join("|")})\\b`, "g");
  const nonButtonRender = new RegExp(`render=\\{\\s*<(${NON_BUTTON.join("|")})\\b`);
  const found: string[] = [];
  for (const match of source.matchAll(tag)) {
    const opening = openingTag(source, match.index);
    if (nonButtonRender.test(opening) && !/nativeButton=\{false\}/.test(opening)) {
      found.push(`${match[1]} (ligne ${source.slice(0, match.index).split("\n").length})`);
    }
  }
  return found;
}

describe("nativeButton sur les composants rendus en lien", () => {
  it("repère un bouton rendu en lien sans nativeButton={false}", () => {
    const fautif = `<Button variant="outline" render={<a href={\`/x?id=\${id}\`} />}>Connecter</Button>`;
    const correct = `<Button render={<Link href="/x" />} nativeButton={false}>Voir</Button>`;
    expect(findMissingNativeButton(fautif)).toEqual(["Button (ligne 1)"]);
    expect(findMissingNativeButton(correct)).toEqual([]);
  });

  it("n'en laisse aucun dans le code", () => {
    const offenders = sourceFiles("src").flatMap((file) =>
      findMissingNativeButton(readFileSync(file, "utf8")).map((hit) => `${file} : ${hit}`)
    );
    expect(offenders).toEqual([]);
  });
});
