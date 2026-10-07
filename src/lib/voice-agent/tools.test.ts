import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import {
  MAX_BOOKINGS_PER_SESSION,
  MAX_RECORDS_PER_SESSION,
  createToolSession,
  getToolDefinitions,
  runTool,
  type ToolContext,
  type ToolSession,
} from "./tools";

const configuration = { callRouting: [{ trigger: "urgence", target: "+33612345678" }] };
const ALL_TOOLS = ["check_availability", "book_appointment", "take_order", "take_message", "transfer_call"];

function openSession(): ToolSession {
  return { allowedTools: new Set(ALL_TOOLS), bookings: 0, records: 0 };
}

let testContext: ToolContext;
let realContext: ToolContext;

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
  // Les créneaux des tests (1er octobre 2026) sont à venir.
  vi.useFakeTimers({ now: new Date("2026-09-01T08:00:00Z"), toFake: ["Date"] });
  testContext = { clientServiceId: "cs_1", callId: "call_1", configuration, session: openSession(), testMode: true };
  realContext = { ...testContext, session: openSession(), testMode: false };
});

afterEach(() => {
  vi.useRealTimers();
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
    await runTool(
      "take_order",
      { customerName: "Test", customerPhone: "06", items: [{ name: "Pizza", quantity: 1 }] },
      testContext
    );
    await runTool("take_message", { customerName: "Test", customerPhone: "06", reason: "rappel" }, testContext);
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

const validBooking = {
  customerName: "Client",
  customerPhone: "0600000000",
  startAt: "2026-10-01T09:00:00Z",
  durationMinutes: 30,
};

describe("runTool : liste des outils autorisés", () => {
  it("refuse un outil qui n'a pas été proposé pour la session", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const session = createToolSession(getToolDefinitions("assistant-whatsapp", { objectives: ["order"] }, false));
    const result = await runTool("book_appointment", validBooking, { ...realContext, session });
    expect(result).toContain("n'est pas disponible");
    expect(mocks.getScheduler).not.toHaveBeenCalled();
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("exécute un outil proposé", async () => {
    const session = createToolSession(getToolDefinitions("standard-telephonique-ia", configuration, false));
    const result = await runTool(
      "take_message",
      { customerName: "A", customerPhone: "06", reason: "rappel" },
      { ...realContext, session }
    );
    expect(result).toBe("Message enregistré, l'entreprise rappellera.");
    expect(mocks.bookingCreate).toHaveBeenCalledOnce();
  });
});

describe("runTool : arguments invalides", () => {
  beforeEach(() => {
    mocks.getScheduler.mockResolvedValue(scheduler());
    mocks.book.mockResolvedValue({ googleEventId: "evt" });
  });

  it.each([
    ["une date illisible", { startAt: "demain" }],
    ["une date passée", { startAt: "2026-08-01T09:00:00Z" }],
    ["une date à plus d'un an", { startAt: "2028-01-01T09:00:00Z" }],
    ["une durée négative", { durationMinutes: -30 }],
    ["une durée démesurée", { durationMinutes: 10_000 }],
    ["une durée non entière", { durationMinutes: 12.5 }],
    ["un nom manquant", { customerName: "  " }],
  ])("refuse un rendez-vous avec %s", async (_label, override) => {
    const result = await runTool("book_appointment", { ...validBooking, ...override }, realContext);
    expect(result).not.toContain("confirmé");
    expect(mocks.book).not.toHaveBeenCalled();
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });

  it("refuse une date illisible pour check_availability sans consulter l'agenda", async () => {
    const result = await runTool("check_availability", { startAt: "n'importe quand", durationMinutes: 30 }, realContext);
    expect(result).toContain("invalide");
    expect(mocks.isSlotFree).not.toHaveBeenCalled();
  });

  it("tronque les champs libres avant de les enregistrer", async () => {
    await runTool(
      "book_appointment",
      { ...validBooking, customerName: `  ${"N".repeat(500)}  `, notes: "x".repeat(5000) },
      realContext
    );
    const data = mocks.bookingCreate.mock.calls[0][0].data;
    expect(data.customerName).toHaveLength(100);
    expect(data.notes).toHaveLength(1000);
  });

  it.each([
    ["aucun article", []],
    ["une quantité négative", [{ name: "Pizza", quantity: -2 }]],
    ["une quantité non numérique", [{ name: "Pizza", quantity: "beaucoup" }]],
    ["une quantité trop grande", [{ name: "Pizza", quantity: 100 }]],
    ["trop d'articles", Array.from({ length: 51 }, () => ({ name: "Pizza", quantity: 1 }))],
  ])("refuse une commande avec %s", async (_label, items) => {
    const result = await runTool(
      "take_order",
      { customerName: "A", customerPhone: "06", items, fulfillment: "pickup" },
      realContext
    );
    expect(result).not.toBe("Commande enregistrée.");
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });

  it("n'enregistre que les champs attendus des articles, bornés", async () => {
    await runTool(
      "take_order",
      {
        customerName: "A",
        customerPhone: "06",
        items: [{ name: "Pizza", quantity: 2, injected: "x".repeat(10_000) }],
        fulfillment: "delivery",
        address: "a".repeat(1000),
      },
      realContext
    );
    const { metadata } = mocks.bookingCreate.mock.calls[0][0].data;
    expect(metadata.items).toEqual([{ name: "Pizza", quantity: 2 }]);
    expect(metadata.address).toHaveLength(300);
  });

  it("exige une adresse pour une livraison", async () => {
    const result = await runTool(
      "take_order",
      { customerName: "A", customerPhone: "06", items: [{ name: "Pizza", quantity: 1 }], fulfillment: "delivery" },
      realContext
    );
    expect(result).toContain("adresse");
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });
});

describe("runTool : plafonds par appel ou conversation", () => {
  it(`ne réserve pas plus de ${MAX_BOOKINGS_PER_SESSION} rendez-vous, même en parallèle`, async () => {
    mocks.getScheduler.mockResolvedValue(scheduler());
    mocks.book.mockResolvedValue({ googleEventId: "evt" });
    const results = await Promise.all(
      Array.from({ length: MAX_BOOKINGS_PER_SESSION + 2 }, () =>
        runTool("book_appointment", validBooking, realContext)
      )
    );
    expect(mocks.book).toHaveBeenCalledTimes(MAX_BOOKINGS_PER_SESSION);
    expect(mocks.bookingCreate).toHaveBeenCalledTimes(MAX_BOOKINGS_PER_SESSION);
    expect(results.filter((r) => r.startsWith("Limite atteinte"))).toHaveLength(2);
  });

  it(`n'enregistre pas plus de ${MAX_RECORDS_PER_SESSION} commandes ou messages`, async () => {
    const order = { customerName: "A", customerPhone: "06", items: [{ name: "Pizza", quantity: 1 }] };
    const message = { customerName: "A", customerPhone: "06", reason: "rappel" };
    for (let i = 0; i < MAX_RECORDS_PER_SESSION; i++) {
      await runTool(i % 2 ? "take_order" : "take_message", i % 2 ? order : message, realContext);
    }
    const result = await runTool("take_message", message, realContext);
    expect(result).toMatch(/^Limite atteinte/);
    expect(mocks.bookingCreate).toHaveBeenCalledTimes(MAX_RECORDS_PER_SESSION);
  });

  it("ne compte pas un appel d'outil refusé pour arguments invalides", async () => {
    await runTool("take_message", { customerName: "", customerPhone: "" }, realContext);
    expect(realContext.session.records).toBe(0);
  });
});
