import { describe, expect, it } from "vitest";
import { csvResponseHeaders, toCsv } from "./csv";

type Row = { name: string; amount: number; date: Date; note: string | null };

const columns = [
  { header: "Nom", value: (r: Row) => r.name },
  { header: "Montant", value: (r: Row) => r.amount },
  { header: "Date", value: (r: Row) => r.date },
  { header: "Note", value: (r: Row) => r.note },
];

function row(overrides: Partial<Row> = {}): Row {
  return {
    name: "Plomberie Lefèvre",
    amount: 79,
    date: new Date("2026-09-08T10:00:00Z"),
    note: null,
    ...overrides,
  };
}

const BOM = "﻿";

describe("toCsv", () => {
  it("ouvre par un BOM et sépare par des points-virgules", () => {
    const csv = toCsv([row()], columns);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.split("\r\n")[0]).toBe(`${BOM}Nom;Montant;Date;Note`);
  });

  it("écrit une ligne par enregistrement, en CRLF", () => {
    const csv = toCsv([row(), row({ name: "Atelier Dubreuil" })], columns);
    expect(csv.split("\r\n")).toHaveLength(3);
  });

  it("protège un champ contenant le séparateur", () => {
    const csv = toCsv([row({ name: "Dupont; et fils" })], columns);
    expect(csv).toContain('"Dupont; et fils"');
  });

  it("double les guillemets d'un champ cité", () => {
    const csv = toCsv([row({ note: 'Il a dit "oui"' })], columns);
    expect(csv).toContain('"Il a dit ""oui"""');
  });

  it("protège un champ contenant un saut de ligne", () => {
    const csv = toCsv([row({ note: "ligne 1\nligne 2" })], columns);
    expect(csv).toContain('"ligne 1\nligne 2"');
  });

  it("ne cite pas un champ ordinaire", () => {
    expect(toCsv([row()], columns)).toContain("Plomberie Lefèvre;79;");
  });

  it("rend une valeur absente par une cellule vide", () => {
    const csv = toCsv([row({ note: null })], columns);
    expect(csv.split("\r\n")[1].endsWith(";")).toBe(true);
  });

  it("écrit les dates en ISO, non ambiguës", () => {
    expect(toCsv([row()], columns)).toContain("2026-09-08T10:00:00.000Z");
  });

  it("produit un fichier réduit à ses en-têtes quand il n'y a rien à exporter", () => {
    expect(toCsv([], columns)).toBe(`${BOM}Nom;Montant;Date;Note`);
  });
});

describe("csvResponseHeaders", () => {
  it("déclenche un téléchargement, sous un nom daté", () => {
    const headers = csvResponseHeaders("clients") as Record<string, string>;
    expect(headers["Content-Disposition"]).toMatch(
      /^attachment; filename="clients-\d{4}-\d{2}-\d{2}\.csv"$/
    );
  });

  it("interdit la mise en cache", () => {
    const headers = csvResponseHeaders("clients") as Record<string, string>;
    expect(headers["Cache-Control"]).toBe("no-store");
  });
});

describe("toCsv — neutralisation des formules", () => {
  type Cell = { label: string };
  const cell = [{ header: "Libellé", value: (r: Cell) => r.label }];

  /** La seule ligne de données, BOM et en-tête retirés. */
  function line(label: string): string {
    return toCsv([{ label }], cell).split("\r\n")[1];
  }

  it("désamorce une valeur commençant par un signe égal", () => {
    // Apostrophe ajoutée, puis guillemetage car la valeur contient des
    // guillemets — qui sont doublés.
    expect(line('=HYPERLINK("https://exemple.test")')).toBe(
      `"'=HYPERLINK(""https://exemple.test"")"`
    );
  });

  it("désamorce les autres amorces reconnues par les tableurs", () => {
    expect(line("+1")).toBe("'+1");
    expect(line("-1+2")).toBe("'-1+2");
    expect(line("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(line("\tcalc")).toBe("'\tcalc");
  });

  it("désamorce la formule DDE, celle qui vise l'exécution de commande", () => {
    // Pas de guillemetage : ni guillemet ni séparateur dans la valeur.
    expect(line("=cmd|'/c calc'!A0")).toBe("'=cmd|'/c calc'!A0");
  });

  it("neutralise avant de guillemeter, pour protéger l'apostrophe aussi", () => {
    expect(line("=A1;B2")).toBe(`"'=A1;B2"`);
  });

  it("laisse intacte une valeur ordinaire", () => {
    expect(line("Boulangerie Martin")).toBe("Boulangerie Martin");
    expect(line("79 €")).toBe("79 €");
  });

  it("protège aussi les en-têtes", () => {
    expect(toCsv([], [{ header: "=1+1", value: () => "" }])).toContain("'=1+1");
  });
});
