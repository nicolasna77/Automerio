import { describe, expect, it } from "vitest";
import type { WeeklyHours } from "@/lib/catalog";
import { hoursOf, isOpenAt } from "./business-hours";

const open = (from: string, to: string) => ({ closed: false, open: from, close: to });
const closed = { closed: true, open: "09:00", close: "18:00" };

const HOURS: WeeklyHours = {
  mon: open("09:00", "18:00"),
  tue: open("09:00", "18:00"),
  wed: open("09:00", "18:00"),
  thu: open("09:00", "18:00"),
  fri: open("09:00", "18:00"),
  sat: open("09:00", "12:00"),
  sun: closed,
};

describe("isOpenAt", () => {
  // Le lundi 28 septembre 2026 ; Paris est a UTC+2 en ete.
  it("lit l'heure a Paris, pas celle du serveur", () => {
    expect(isOpenAt(HOURS, new Date("2026-09-28T07:30:00Z"))).toBe(true); // 9 h 30 a Paris
    expect(isOpenAt(HOURS, new Date("2026-09-28T06:30:00Z"))).toBe(false); // 8 h 30 a Paris
  });

  it("ferme a l'heure de fermeture, pas une minute apres", () => {
    expect(isOpenAt(HOURS, new Date("2026-09-28T15:59:00Z"))).toBe(true); // 17 h 59
    expect(isOpenAt(HOURS, new Date("2026-09-28T16:00:00Z"))).toBe(false); // 18 h
  });

  it("respecte les jours fermes et les demi-journees", () => {
    expect(isOpenAt(HOURS, new Date("2026-09-27T10:00:00Z"))).toBe(false); // dimanche midi
    expect(isOpenAt(HOURS, new Date("2026-09-26T11:00:00Z"))).toBe(false); // samedi 13 h
  });

  it("considere ouverte une entreprise sans horaires", () => {
    expect(isOpenAt(null, new Date("2026-09-27T03:00:00Z"))).toBe(true);
  });
});

describe("hoursOf", () => {
  it("lit les horaires quel que soit le champ qui les porte", () => {
    expect(hoursOf({ businessHours: HOURS })).toBe(HOURS);
    expect(hoursOf({ openingHours: HOURS })).toBe(HOURS);
    expect(hoursOf({})).toBeNull();
  });
});
