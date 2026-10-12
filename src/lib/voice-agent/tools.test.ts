import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Configuration } from "@/lib/catalog";

const mocks = vi.hoisted(() => ({
  bookingCreate: vi.fn(),
  bookingFindMany: vi.fn(),
  bookingDelete: vi.fn(),
  bookingUpdate: vi.fn(),
  cancel: vi.fn(),
  changeSms: vi.fn(),
  getScheduler: vi.fn(),
  book: vi.fn(),
  isSlotFree: vi.fn(),
  refer: vi.fn(),
  confirmSms: vi.fn(),
  deliverWebhook: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    booking: {
      create: mocks.bookingCreate,
      findMany: mocks.bookingFindMany,
      delete: mocks.bookingDelete,
      update: mocks.bookingUpdate,
    },
  },
}));
vi.mock("@/lib/scheduling", () => ({ getScheduler: mocks.getScheduler }));
vi.mock("@/lib/booking-sms", () => ({
  sendBookingConfirmationSms: mocks.confirmSms,
  sendAppointmentChangeSms: mocks.changeSms,
}));
vi.mock("@/lib/outgoing-webhook", () => ({ deliverWebhook: mocks.deliverWebhook }));
vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({ realtime: { calls: { refer: mocks.refer } } }),
}));

import {
  MAX_BOOKINGS_PER_SESSION,
  MAX_CHANGES_PER_SESSION,
  MAX_RECORDS_PER_SESSION,
  createToolSession,
  getToolDefinitions,
  runTool,
  type ToolContext,
  type ToolSession,
} from "./tools";

const configuration = { callRouting: [{ trigger: "urgence", target: "+33612345678" }] };
const ALL_TOOLS = [
  "check_availability",
  "book_appointment",
  "find_my_appointments",
  "cancel_appointment",
  "reschedule_appointment",
  "take_order",
  "take_message",
  "transfer_call",
];

function openSession(): ToolSession {
  return { allowedTools: new Set(ALL_TOOLS), bookings: 0, records: 0, changes: 0 };
}

let testContext: ToolContext;
let realContext: ToolContext;

function scheduler(fixedDurationMinutes: number | null = null) {
  return {
    provider: fixedDurationMinutes ? "calcom" : "google",
    fixedDurationMinutes,
    isSlotFree: mocks.isSlotFree,
    book: mocks.book,
    cancel: mocks.cancel,
  };
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.confirmSms.mockResolvedValue(true);
  mocks.deliverWebhook.mockResolvedValue(undefined);
  mocks.changeSms.mockResolvedValue(true);
  mocks.bookingCreate.mockImplementation(async ({ data }) => ({ id: "bk_1", startAt: null, endAt: null, notes: null, metadata: null, ...data }));
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

describe("demande de devis", () => {
  const quoteConfiguration = { ...configuration, quoteRequests: "on" };
  const quote = {
    customerName: "Claire Vasseur",
    customerPhone: "0612345678",
    workType: "Remplacement chauffe-eau",
    address: "12 rue des Lilas, Lyon",
    urgent: true,
    preferredSlot: "jeudi matin",
    details: "Ballon de 200 L",
  };

  it("n'est proposée au standard que si le réglage est activé", () => {
    const names = (config: Configuration) =>
      getToolDefinitions("standard-telephonique-ia", config, false).map((tool) => tool.function.name);
    expect(names(configuration)).not.toContain("take_quote_request");
    expect(names(quoteConfiguration)).toContain("take_quote_request");
  });

  it("enregistre la demande rattachée à l'appel et confirme par SMS", async () => {
    const session = createToolSession(getToolDefinitions("standard-telephonique-ia", quoteConfiguration, false));
    const result = await runTool("take_quote_request", quote, { ...realContext, configuration: quoteConfiguration, session });
    expect(result).toBe("Demande de devis enregistrée, l'entreprise rappellera.");
    expect(mocks.bookingCreate).toHaveBeenCalledWith({
      data: {
        clientServiceId: "cs_1",
        kind: "quote",
        customerName: "Claire Vasseur",
        customerPhone: "0612345678",
        notes: "Ballon de 200 L",
        metadata: {
          callId: "call_1",
          workType: "Remplacement chauffe-eau",
          address: "12 rue des Lilas, Lyon",
          urgent: true,
          preferredSlot: "jeudi matin",
        },
      },
    });
    expect(mocks.confirmSms).toHaveBeenCalledWith({
      clientServiceId: "cs_1",
      kind: "quote",
      customerPhone: "0612345678",
      workType: "Remplacement chauffe-eau",
    });
  });

  it("refuse une demande sans nature des travaux", async () => {
    const session = createToolSession(getToolDefinitions("standard-telephonique-ia", quoteConfiguration, false));
    const result = await runTool("take_quote_request", { ...quote, workType: " " }, { ...realContext, session });
    expect(result).toContain("nature des travaux");
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });

  it("n'écrit rien et n'envoie aucun SMS en appel d'essai", async () => {
    const session = createToolSession(getToolDefinitions("standard-telephonique-ia", quoteConfiguration, false));
    await runTool("take_quote_request", quote, { ...testContext, session });
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
    expect(mocks.confirmSms).not.toHaveBeenCalled();
  });
});

describe("webhook sortant", () => {
  it("annonce chaque réservation créée, avec le canal", async () => {
    const session = createToolSession(getToolDefinitions("standard-telephonique-ia", configuration, false));
    await runTool("take_message", { customerName: "A", customerPhone: "0612345678", reason: "rappel" }, { ...realContext, session });
    expect(mocks.deliverWebhook).toHaveBeenCalledWith(
      "cs_1",
      "booking.created",
      expect.objectContaining({ bookingId: "bk_1", kind: "message", customerName: "A", channel: "phone" })
    );
  });

  it("n'annonce rien en appel d'essai", async () => {
    await runTool("take_message", { customerName: "A", customerPhone: "06", reason: "rappel" }, testContext);
    expect(mocks.deliverWebhook).not.toHaveBeenCalled();
  });
});

describe("annuler ou déplacer un rendez-vous", () => {
  const CALLER = "+33612345678";
  const mine = {
    id: "bk_mine",
    customerName: "Léa Martin",
    customerPhone: "06 12 34 56 78",
    startAt: new Date("2026-10-01T09:00:00Z"),
    endAt: new Date("2026-10-01T09:30:00Z"),
    notes: "Coupe",
    googleEventId: "evt_1",
    externalBookingId: null,
  };
  const someoneElse = { ...mine, id: "bk_other", customerPhone: "0699999999" };

  beforeEach(() => {
    mocks.bookingFindMany.mockResolvedValue([mine, someoneElse]);
    mocks.getScheduler.mockResolvedValue(scheduler());
    realContext = { ...realContext, callerNumber: CALLER };
  });

  it("est proposé avec la prise de rendez-vous, seulement si un agenda est connecté", () => {
    const names = (connected: boolean) =>
      getToolDefinitions("prise-rendez-vous-telephone", { objectives: ["appointment"] }, connected).map(
        (tool) => tool.function.name
      );
    expect(names(true)).toEqual(expect.arrayContaining(["find_my_appointments", "cancel_appointment", "reschedule_appointment"]));
    expect(names(false)).not.toContain("cancel_appointment");
  });

  it("ne liste que les rendez-vous pris avec le numéro qui appelle", async () => {
    const result = await runTool("find_my_appointments", {}, realContext);
    expect(result).toContain("bk_mine");
    expect(result).not.toContain("bk_other");
  });

  it("refuse tout quand le numéro est masqué", async () => {
    const hidden = { ...realContext, callerNumber: null };
    expect(await runTool("find_my_appointments", {}, hidden)).toContain("masqué");
    expect(await runTool("cancel_appointment", { appointmentId: "bk_mine" }, hidden)).toContain("masqué");
    expect(mocks.bookingFindMany).not.toHaveBeenCalled();
  });

  it("n'annule pas le rendez-vous d'un autre numéro", async () => {
    const result = await runTool("cancel_appointment", { appointmentId: "bk_other" }, realContext);
    expect(result).toContain("n'a pas été pris avec ce numéro");
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.bookingDelete).not.toHaveBeenCalled();
  });

  it("annule dans l'agenda, supprime le rendez-vous et prévient par SMS et webhook", async () => {
    mocks.cancel.mockResolvedValue(true);
    const result = await runTool("cancel_appointment", { appointmentId: "bk_mine" }, realContext);
    expect(result).toContain("annulé");
    expect(mocks.cancel).toHaveBeenCalledWith(mine);
    expect(mocks.bookingDelete).toHaveBeenCalledWith({ where: { id: "bk_mine" } });
    expect(mocks.changeSms).toHaveBeenCalledWith(expect.objectContaining({ change: "canceled", startAt: mine.startAt }));
    expect(mocks.deliverWebhook).toHaveBeenCalledWith("cs_1", "booking.canceled", expect.objectContaining({ bookingId: "bk_mine" }));
  });

  it("garde le rendez-vous si l'agenda refuse l'annulation", async () => {
    mocks.cancel.mockResolvedValue(false);
    const result = await runTool("cancel_appointment", { appointmentId: "bk_mine" }, realContext);
    expect(result).toContain("Ne le présente pas comme annulé");
    expect(mocks.bookingDelete).not.toHaveBeenCalled();
    expect(mocks.changeSms).not.toHaveBeenCalled();
  });

  it("déplace : réserve le nouveau créneau, libère l'ancien, remet le rappel à zéro", async () => {
    mocks.isSlotFree.mockResolvedValue(true);
    mocks.book.mockResolvedValue({ googleEventId: "evt_2" });
    mocks.cancel.mockResolvedValue(true);
    const result = await runTool(
      "reschedule_appointment",
      { appointmentId: "bk_mine", newStartAt: "2026-10-02T14:00:00Z" },
      realContext
    );
    expect(result).toContain("déplacé");
    expect(mocks.isSlotFree).toHaveBeenCalledWith(new Date("2026-10-02T14:00:00Z"), 30);
    expect(mocks.bookingUpdate).toHaveBeenCalledWith({
      where: { id: "bk_mine" },
      data: expect.objectContaining({ googleEventId: "evt_2", reminderSentAt: null }),
    });
    expect(mocks.changeSms).toHaveBeenCalledWith(expect.objectContaining({ change: "moved" }));
  });

  it("ne touche à rien si le nouveau créneau est pris", async () => {
    mocks.isSlotFree.mockResolvedValue(false);
    const result = await runTool(
      "reschedule_appointment",
      { appointmentId: "bk_mine", newStartAt: "2026-10-02T14:00:00Z" },
      realContext
    );
    expect(result).toContain("pas disponible");
    expect(mocks.book).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.bookingUpdate).not.toHaveBeenCalled();
  });

  it(`ne fait pas plus de ${MAX_CHANGES_PER_SESSION} changements par appel`, async () => {
    mocks.cancel.mockResolvedValue(true);
    for (let i = 0; i < MAX_CHANGES_PER_SESSION; i += 1) {
      await runTool("cancel_appointment", { appointmentId: "bk_mine" }, realContext);
    }
    const result = await runTool("cancel_appointment", { appointmentId: "bk_mine" }, realContext);
    expect(result).toContain("Limite atteinte");
    expect(mocks.cancel).toHaveBeenCalledTimes(MAX_CHANGES_PER_SESSION);
  });
});
