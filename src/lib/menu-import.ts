export const MENU_IMPORT_MAX_FILES = 5;
export const MENU_IMPORT_MAX_TOTAL_BYTES = 12 * 1024 * 1024;

export type MenuFileKind = "pdf" | "image";

const SIGNATURES: { mime: string; kind: MenuFileKind; matches: (bytes: Uint8Array) => boolean }[] = [
  { mime: "application/pdf", kind: "pdf", matches: (b) => ascii(b, 0, 5) === "%PDF-" },
  { mime: "image/jpeg", kind: "image", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", kind: "image", matches: (b) => ascii(b, 1, 4) === "PNG" },
  { mime: "image/webp", kind: "image", matches: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP" },
  { mime: "image/gif", kind: "image", matches: (b) => ascii(b, 0, 4) === "GIF8" },
];

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

export type MenuDocument = { name: string; mime: string; kind: MenuFileKind; base64: string };

export type MenuFileCheck =
  | { ok: true; mime: string; kind: MenuFileKind }
  | { ok: false; error: string };

export function detectMenuFile(bytes: Uint8Array): MenuFileCheck {
  const match = SIGNATURES.find((signature) => signature.matches(bytes));
  if (!match) {
    return {
      ok: false,
      error: "Format non pris en charge : envoyez une photo (JPG, PNG, WebP) ou un PDF.",
    };
  }
  return { ok: true, mime: match.mime, kind: match.kind };
}
