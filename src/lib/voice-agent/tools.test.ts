import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bookingCreate: vi.fn(),
  createCalendarEvent: vi.fn(),
  isSlotFree: vi.fn(),
  refer: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { booking: { create: mocks.bookingCreate } } }));
vi.mock("@/lib/google-calendar", () => ({
  createCalendarEvent: mocks.createCalendarEvent,
  isSlotFree: mocks.isSlotFree,
}));
vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({ realtime: { calls: { refer: mocks.refer } } }),
}));

import { runTool } from "./tools";

const configuration = { callRouting: [{ trigger: "urgence", target: "+33612345678" }] };
const testContext = { clientServiceId: "cs_1", callId: "call_1", configuration, testMode: true };

describe("runTool en appel de test", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
  });

  it("confirme un rendez-vous sans l'ecrire ni toucher a l'agenda", async () => {
    const result = await runTool(
      "book_appointment",
      { customerName: "Test", customerPhone: "0600000000", startAt: "2026-10-01T09:00:00Z", durationMinutes: 30 },
      testContext
    );
    expect(result).toBe("Rendez-vous confirmé et ajouté à l'agenda.");
    expect(mocks.createCalendarEvent).not.toHaveBeenCalled();
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });

  it("n'enregistre ni commande ni message", async () => {
    await runTool("take_order", { customerName: "Test", items: [] }, testContext);
    await runTool("take_message", { customerName: "Test", reason: "rappel" }, testContext);
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });

  it("simule le transfert au lieu de passer l'appel", async () => {
    const result = await runTool("transfer_call", { reason: "urgence" }, testContext);
    expect(result).toContain("Transfert simulé vers +33612345678");
    expect(mocks.refer).not.toHaveBeenCalled();
  });

  it("consulte quand meme l'agenda : c'est une lecture", async () => {
    mocks.isSlotFree.mockResolvedValue(true);
    const result = await runTool(
      "check_availability",
      { startAt: "2026-10-01T09:00:00Z", durationMinutes: 30 },
      testContext
    );
    expect(result).toBe("Le créneau est libre.");
    expect(mocks.isSlotFree).toHaveBeenCalledOnce();
  });
});

describe("runTool en appel reel", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
  });

  it("enregistre le rendez-vous", async () => {
    mocks.createCalendarEvent.mockResolvedValue("evt_1");
    await runTool(
      "book_appointment",
      { customerName: "Client", customerPhone: "0600000000", startAt: "2026-10-01T09:00:00Z", durationMinutes: 30 },
      { ...testContext, testMode: false }
    );
    expect(mocks.bookingCreate).toHaveBeenCalledOnce();
  });
});
