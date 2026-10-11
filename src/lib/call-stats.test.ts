import { describe, expect, it } from "vitest";
import type { WeeklyHours } from "@/lib/catalog";
import { computeCallStats } from "./call-stats";

const open = { closed: false, open: "09:00", close: "18:00" };
const HOURS: WeeklyHours = {
  mon: open,
  tue: open,
  wed: open,
  thu: open,
  fri: open,
  sat: { closed: true, open: "09:00", close: "18:00" },
  sun: { closed: true, open: "09:00", close: "18:00" },
};

// Lundi 28 septembre 2026 : Paris = UTC + 2.
const at = (utc: string) => new Date(`2026-09-28T${utc}:00Z`);

describe("computeCallStats", () => {
  it("compte par heure de Paris et repère l'heure la plus chargée", () => {
    const stats = computeCallStats(
      [
        { occurredAt: at("08:05"), outcome: null, reason: null },
        { occurredAt: at("08:40"), outcome: null, reason: null },
        { occurredAt: at("13:10"), outcome: null, reason: null },
      ],
      null
    );
    expect(stats.total).toBe(3);
    expect(stats.byHour[10].count).toBe(2);
    expect(stats.byHour[15].count).toBe(1);
    expect(stats.busiestHour).toBe(10);
    expect(stats.outOfHoursShare).toBeNull();
  });

  it("calcule la part des rendez-vous ou commandes et celle hors horaires", () => {
    const stats = computeCallStats(
      [
        { occurredAt: at("08:00"), outcome: "appointment_booked", reason: null },
        { occurredAt: at("09:00"), outcome: "order_taken", reason: null },
        { occurredAt: at("18:00"), outcome: "message_taken", reason: null },
        { occurredAt: at("05:00"), outcome: "no_action", reason: null },
      ],
      HOURS
    );
    expect(stats.bookedShare).toBe(0.5);
    expect(stats.outOfHoursShare).toBe(0.5);
  });

  it("regroupe les motifs à la casse près et garde les trois premiers", () => {
    const rows = ["Fuite", "fuite ", "Devis", "Horaires", "Devis", "Fuite", "Panne"].map((reason) => ({
      occurredAt: at("09:00"),
      outcome: null,
      reason,
    }));
    expect(computeCallStats(rows, null).topReasons).toEqual([
      { reason: "Fuite", count: 3 },
      { reason: "Devis", count: 2 },
      { reason: "Horaires", count: 1 },
    ]);
  });

  it("reste vide sans appel", () => {
    const stats = computeCallStats([], HOURS);
    expect(stats).toMatchObject({ total: 0, bookedShare: null, outOfHoursShare: null, busiestHour: null, topReasons: [] });
  });
});
