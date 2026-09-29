import { describe, expect, it } from "vitest";
import { calendarWindow, toCalendarBookings } from "./bookings";

type TestBooking = Parameters<typeof toCalendarBookings>[0][number];

function booking(overrides: Partial<TestBooking> = {}): TestBooking {
  return {
    id: "b1",
    kind: "appointment",
    customerName: "Mme Renard",
    startAt: new Date("2026-09-08T09:00:00Z"),
    endAt: new Date("2026-09-08T10:00:00Z"),
    notes: null,
    googleEventId: null,
    ...overrides,
  } as TestBooking;
}

const options = {
  subtitle: () => "Plomberie Lefèvre",
  isSynced: () => true,
};

describe("toCalendarBookings", () => {
  it("place sur la grille ce qui a un horaire", () => {
    const { scheduled, unscheduled } = toCalendarBookings([booking()], options);
    expect(unscheduled).toHaveLength(0);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]).toMatchObject({
      id: "b1",
      title: "Mme Renard",
      subtitle: "Plomberie Lefèvre",
      synced: true,
    });
  });

  it("écarte de la grille ce qui n'a pas d'horaire", () => {
    const { scheduled, unscheduled } = toCalendarBookings(
      [booking({ kind: "order", startAt: null, endAt: null })],
      options
    );
    expect(scheduled).toHaveLength(0);
    expect(unscheduled).toHaveLength(1);
  });

  it("préfixe une commande de son type, pour la distinguer dans la liste", () => {
    const { unscheduled } = toCalendarBookings(
      [booking({ kind: "order", startAt: null, endAt: null })],
      options
    );
    expect(unscheduled[0].title).toBe("Commande · Mme Renard");
  });

  it("retombe sur le type brut si un nouveau type apparaît", () => {
    const { unscheduled } = toCalendarBookings(
      [booking({ kind: "rappel", startAt: null, endAt: null })],
      options
    );
    expect(unscheduled[0].title).toBe("rappel · Mme Renard");
  });

  it("répartit un lot mêlant les deux natures", () => {
    const { scheduled, unscheduled } = toCalendarBookings(
      [
        booking({ id: "a" }),
        booking({ id: "b", startAt: null, endAt: null, kind: "order" }),
        booking({ id: "c" }),
      ],
      options
    );
    expect(scheduled.map((b) => b.id)).toEqual(["a", "c"]);
    expect(unscheduled.map((b) => b.id)).toEqual(["b"]);
  });

  it("reporte l'état de synchronisation décidé par l'appelant", () => {
    const { scheduled } = toCalendarBookings([booking()], {
      ...options,
      isSynced: (b) => Boolean(b.googleEventId),
    });
    expect(scheduled[0].synced).toBe(false);
  });
});

describe("calendarWindow", () => {
  it("encadre aujourd'hui d'un an de part et d'autre", () => {
    const { gte, lte } = calendarWindow();
    const now = new Date();
    expect(gte.getTime()).toBeLessThan(now.getTime());
    expect(lte.getTime()).toBeGreaterThan(now.getTime());

    const spanInYears =
      (lte.getTime() - gte.getTime()) / (365 * 24 * 60 * 60 * 1000);
    expect(spanInYears).toBeGreaterThan(1.9);
    expect(spanInYears).toBeLessThan(2.1);
  });
});
