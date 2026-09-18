import { describe, expect, it } from "vitest";
import { detectMenuFile } from "./menu-import";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(
    values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v]))
  );

describe("detectMenuFile", () => {
  it("reconnaît un PDF et les formats d'image acceptés par leur signature", () => {
    expect(detectMenuFile(bytes("%PDF-1.7"))).toEqual({ ok: true, mime: "application/pdf", kind: "pdf" });
    expect(detectMenuFile(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({ ok: true, mime: "image/jpeg", kind: "image" });
    expect(detectMenuFile(bytes(0x89, "PNG", 0x0d, 0x0a))).toEqual({ ok: true, mime: "image/png", kind: "image" });
    expect(detectMenuFile(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "))).toEqual({ ok: true, mime: "image/webp", kind: "image" });
    expect(detectMenuFile(bytes("GIF89a"))).toEqual({ ok: true, mime: "image/gif", kind: "image" });
  });

  it("refuse un fichier dont le contenu ne correspond à aucun format accepté", () => {
    const heic = bytes(0, 0, 0, 0x18, "ftypheic");
    expect(detectMenuFile(heic).ok).toBe(false);
    expect(detectMenuFile(bytes("<html>")).ok).toBe(false);
    expect(detectMenuFile(new Uint8Array()).ok).toBe(false);
  });
});
