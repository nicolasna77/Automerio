import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bookingCreate: vi.fn(),
  getScheduler: vi.fn(),
  book: vi.fn(),
  isSlotFree: vi.fn(),
  refer: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { booking: { create: mocks.bookingCreate } } }));
vi.mock("@/lib/scheduling", () => ({ getScheduler: mocks.getScheduler }));
vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({ realtime: { calls: { refer: mocks.refer } } }),
}));

import { getToolDefinitions, runTool } from "./tools";

const configuration = { callRouting: [{ trigger: "urgence", target: "+33612345678" }] };
const testContext = { clientServiceId: "cs_1", callId: "call_1", configuration, testMode: true };
const realContext = { ...testContext, testMode: false };

function scheduler(fixedDurationMinutes: number | null = null) {
  return {
    provider: fixedDurationMinutes ? "calcom" : "google",
    fixedDurationMinutes,
    isSlotFree: mocks.isSlotFree,
    book: mocks.book,
  };
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});

describe("runTool en appel de test", () => {
  it("confirme un rendez-vous sans l'ecrire ni toucher a l'agenda", async () => {
    mocks.getScheduler.mockResolvedValue(scheduler());
    const result = await runTool(
      "book_appointment",
      { customerName: "Test", customerPhone: "0600000000", startAt: "2026-10-01T09:00:00Z", durationMinutes: 30 },
      testContext
    );
    expect(result).toBe("Rendez-vous confirmé et ajouté à l'agenda.");
    expect(mocks.book).not.toHaveBeenCalled();
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
    mocks.getScheduler.mockResolvedValue(scheduler());
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
  it("enregistre le rendez-vous et sa reference dans l'agenda", async () => {
    mocks.getScheduler.mockResolvedValue(scheduler());
    mocks.book.mockResolvedValue({ googleEventId: "evt_1" });
    const result = await runTool(
      "book_appointment",
      { customerName: "Client", customerPhone: "0600000000", startAt: "2026-10-01T09:00:00Z", durationMinutes: 30 },
      realContext
    );
    expect(result).toBe("Rendez-vous confirmé et ajouté à l'agenda.");
    expect(mocks.bookingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ googleEventId: "evt_1", externalBookingId: null }),
    });
  });

  it("impose la duree du type de rendez-vous Cal.com ou Calendly", async () => {
    mocks.getScheduler.mockResolvedValue(scheduler(60));
    mocks.book.mockResolvedValue({ externalBookingId: "bk_1" });
    await runTool(
      "book_appointment",
      {
        customerName: "Client",
        customerPhone: "+33612345678",
        customerEmail: "client@example.fr",
        startAt: "2026-10-01T09:00:00Z",
        durationMinutes: 30,
      },
      realContext
    );
    expect(mocks.book).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: 60, customerEmail: "client@example.fr" })
    );
    expect(mocks.bookingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        externalBookingId: "bk_1",
        endAt: new Date("2026-10-01T10:00:00Z"),
      }),
    });
  });

  it("ignore une adresse e-mail invalide", async () => {
    mocks.getScheduler.mockResolvedValue(scheduler(30));
    mocks.book.mockResolvedValue({ externalBookingId: "bk_2" });
    await runTool(
      "book_appointment",
      { customerName: "C", customerPhone: "06", customerEmail: "pas une adresse", startAt: "2026-10-01T09:00:00Z" },
      realContext
    );
    expect(mocks.book).toHaveBeenCalledWith(expect.objectContaining({ customerEmail: null }));
  });

  it("garde le rendez-vous quand l'agenda le refuse, et le dit", async () => {
    mocks.getScheduler.mockResolvedValue(scheduler(30));
    mocks.book.mockResolvedValue(null);
    const result = await runTool(
      "book_appointment",
      { customerName: "C", customerPhone: "06", startAt: "2026-10-01T09:00:00Z" },
      realContext
    );
    expect(result).toContain("l'ajout à l'agenda a échoué");
    expect(mocks.bookingCreate).toHaveBeenCalledOnce();
  });
});

describe("getToolDefinitions", () => {
  const rdv = { objectives: ["appointment"] };
  const bookTool = (collectsEmail: boolean) =>
    getToolDefinitions("prise-rdv-telephone", rdv, true, collectsEmail).find(
      (tool) => tool.function.name === "book_appointment"
    );

  it("ne demande l'e-mail que si l'agenda envoie une confirmation", () => {
    const withEmail = bookTool(true)?.function.parameters as { properties: object };
    const withoutEmail = bookTool(false)?.function.parameters as { properties: object };
    expect(withEmail.properties).toHaveProperty("customerEmail");
    expect(withoutEmail.properties).not.toHaveProperty("customerEmail");
  });

  it("ne propose pas la prise de rendez-vous sans agenda connecté", () => {
    const names = getToolDefinitions("prise-rdv-telephone", rdv, false).map((tool) => tool.function.name);
    expect(names).not.toContain("book_appointment");
  });
});
