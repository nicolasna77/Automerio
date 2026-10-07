import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Garde-fou : tout texte visible de l'application passe par messages/*.json.
// On signale le texte JSX et les attributs lus par l'utilisateur (libellés,
// aria-label, placeholder…) écrits en dur dans les composants.
const ROOT = join(process.cwd(), "src");

// Contenus rédigés par langue (pages légales) et modèles d'e-mails : ils ont
// leur propre mécanisme de traduction.
const EXCLUDED = [join("src", "content"), join("src", "lib", "email")];

const VISIBLE_ATTRIBUTES = new Set(["aria-label", "placeholder", "title", "label", "description", "alt"]);

// Noms de marques et touches du clavier : identiques dans toutes les langues.
const ALLOWED = new Set(["WhatsApp", "Messenger", "Instagram", "Cal.com", "Calendly", "Google Agenda", "Stripe", "Automerio"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (EXCLUDED.some((excluded) => relative(process.cwd(), path).startsWith(excluded))) return [];
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith(".tsx") && !name.endsWith(".test.tsx") ? [path] : [];
  });
}

const hasWords = (text: string) => /\p{L}{2,}/u.test(text) && !ALLOWED.has(text.trim());

function hardcodedTexts(path: string): string[] {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && hasWords(node.text)) found.push(node.text.trim());
    if (
      ts.isJsxAttribute(node) &&
      VISIBLE_ATTRIBUTES.has(node.name.getText(source)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      hasWords(node.initializer.text)
    ) {
      found.push(`${node.name.getText(source)}="${node.initializer.text}"`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe("application", () => {
  it("n'affiche aucun texte écrit en dur dans les composants", () => {
    const offenders = sourceFiles(ROOT)
      .map((path) => ({ file: relative(ROOT, path), texts: hardcodedTexts(path) }))
      .filter(({ texts }) => texts.length > 0);
    expect(offenders).toEqual([]);
  });
});
