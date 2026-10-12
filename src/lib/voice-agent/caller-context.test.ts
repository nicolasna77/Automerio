import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), callerAppointments: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { usageEvent: { findFirst: mocks.findFirst } } }));
vi.mock("./tools", () => ({ callerAppointments: mocks.callerAppointments }));

import { formatCallerContext, loadCallerContext } from "./caller-context";

const NOW = new Date("2026-10-12T10:00:00Z");

beforeEach(() => {
  mocks.findFirst.mockReset();
  mocks.callerAppointments.mockReset();
});

describe("loadCallerContext", () => {
  it("renvoie null pour un numéro inconnu", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.callerAppointments.mockResolvedValue([]);
    expect(await loadCallerContext("cs_1", "+33612345678", NOW)).toBeNull();
  });

  it("cherche le numéro dans les appels de la solution, sur 12 mois", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.callerAppointments.mockResolvedValue([]);
    await loadCallerContext("cs_1", "+33612345678", NOW);
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientServiceId: "cs_1",
          metadata: { path: ["fromNumber"], equals: "+33612345678" },
        }),
      })
    );
  });

  it("réunit le nom, le dernier appel et le prochain rendez-vous", async () => {
    mocks.findFirst.mockResolvedValue({
      occurredAt: new Date("2026-10-01T08:00:00Z"),
      callSummary: { callerName: "Léa Martin", reason: "Fuite sous l'évier" },
    });
    mocks.callerAppointments.mockResolvedValue([{ customerName: "Léa", startAt: new Date("2026-10-15T07:00:00Z") }]);
    const context = await loadCallerContext("cs_1", "+33612345678", NOW);
    expect(context).toEqual({
      name: "Léa Martin",
      lastCall: { at: new Date("2026-10-01T08:00:00Z"), reason: "Fuite sous l'évier" },
      nextAppointment: new Date("2026-10-15T07:00:00Z"),
    });
    const text = formatCallerContext(context!);
    expect(text).toContain("Léa Martin");
    expect(text).toContain("Fuite sous l'évier");
    expect(text).toContain("demande d'abord si tu parles bien à cette personne");
  });
});
