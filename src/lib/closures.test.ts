import { describe, expect, it } from "vitest";
import { closureOn, parseClosures, upcomingClosureLines } from "./closures";

const TEXT = ["24/12/2026 - 02/01/2027 : congés de Noël", "15/08/2026", "Fermé le lundi de Pâques", "31/02/2026"].join("\n");

describe("parseClosures", () => {
  it("lit les périodes, les jours seuls et le libellé, et ignore une date impossible", () => {
    expect(parseClosures(TEXT)).toEqual([
      { start: "2026-12-24", end: "2027-01-02", label: "congés de Noël", line: "24/12/2026 - 02/01/2027 : congés de Noël" },
      { start: "2026-08-15", end: "2026-08-15", label: null, line: "15/08/2026" },
    ]);
  });

  it("accepte « au » entre deux dates", () => {
    expect(parseClosures("01/05/2027 au 03/05/2027")[0]).toMatchObject({ start: "2027-05-01", end: "2027-05-03" });
  });
});

describe("closureOn", () => {
  const closures = parseClosures(TEXT);
  it("repère un jour fermé à l'heure de Paris", () => {
    // 23 h 30 à Paris le 23 décembre : encore ouvert.
    expect(closureOn(closures, new Date("2026-12-23T22:30:00Z"))).toBeNull();
    // Minuit et demie à Paris le 24 décembre : fermé.
    expect(closureOn(closures, new Date("2026-12-23T23:30:00Z"))?.label).toBe("congés de Noël");
    expect(closureOn(closures, new Date("2027-01-02T10:00:00Z"))).not.toBeNull();
    expect(closureOn(closures, new Date("2027-01-03T10:00:00Z"))).toBeNull();
  });
});

describe("upcomingClosureLines", () => {
  it("garde les périodes à venir et les lignes non datées, pas les périodes passées", () => {
    expect(upcomingClosureLines(TEXT, new Date("2026-09-01T10:00:00Z"))).toEqual([
      "24/12/2026 - 02/01/2027 : congés de Noël",
      "Fermé le lundi de Pâques",
      "31/02/2026",
    ]);
  });
});
