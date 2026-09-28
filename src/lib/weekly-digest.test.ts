import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/email/notifications", () => ({ sendWeeklyDigestEmail: vi.fn() }));

import { digestHighlights, isEmptyDigest, lastSevenDays } from "./weekly-digest";

const empty = { calls: 0, afterHoursCalls: 0, appointments: 0, orders: 0, messagesAnswered: 0 };

describe("digestHighlights", () => {
  it("met en avant les appels pris hors horaires", () => {
    expect(digestHighlights({ ...empty, calls: 23, afterHoursCalls: 9, appointments: 6 })).toEqual([
      "23 appels pris, dont 9 en dehors de vos horaires",
      "6 rendez-vous pris",
    ]);
  });

  it("accorde au singulier et tait les zeros", () => {
    expect(digestHighlights({ ...empty, calls: 1, orders: 1, messagesAnswered: 1 })).toEqual([
      "1 appel pris",
      "1 commande enregistrée",
      "1 message répondu",
    ]);
  });
});

describe("isEmptyDigest", () => {
  it("n'envoie rien pour une semaine sans activite", () => {
    expect(isEmptyDigest(empty)).toBe(true);
    expect(isEmptyDigest({ ...empty, messagesAnswered: 2 })).toBe(false);
  });
});

describe("lastSevenDays", () => {
  it("couvre les sept jours qui precedent", () => {
    const now = new Date("2026-09-28T07:00:00Z");
    expect(lastSevenDays(now)).toEqual({ start: new Date("2026-09-21T07:00:00Z"), end: now });
  });
});
