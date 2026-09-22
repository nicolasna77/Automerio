const SEPARATOR = ";";
const BOM = "﻿";

export type CsvValue = string | number | boolean | Date | null | undefined;

/**
 * Caracteres par lesquels un tableur reconnait une formule. Une valeur qui
 * commence par l'un d'eux est neutralisee avant d'entrer dans le fichier :
 * l'export porte des champs que le client choisit lui-meme — nom de son
 * organisation, nom d'activation — et un fichier CSV est ouvert par un admin,
 * dans un tableur, avec ses droits.
 */
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

function serializeValue(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  let text = String(value);
  // L'apostrophe fait lire la suite comme du texte, sans la retirer de la
  // valeur affichee. Elle precede le guillemetage, pour etre protegee avec le
  // reste si la valeur contient aussi un separateur.
  if (FORMULA_PREFIXES.some((prefix) => text.startsWith(prefix))) {
    text = `'${text}`;
  }
  if (
    text.includes(SEPARATOR) ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function toCsv<T>(
  rows: T[],
  columns: { header: string; value: (row: T) => CsvValue }[]
): string {
  const lines = [
    columns.map((c) => serializeValue(c.header)).join(SEPARATOR),
    ...rows.map((row) =>
      columns.map((c) => serializeValue(c.value(row))).join(SEPARATOR)
    ),
  ];
  return BOM + lines.join("\r\n");
}

export function csvResponseHeaders(basename: string): HeadersInit {
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${basename}-${stamp}.csv"`,
    "Cache-Control": "no-store",
  };
}
