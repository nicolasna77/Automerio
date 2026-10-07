import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  checkRateLimit: vi.fn(),
  consumedUnits: vi.fn(),
  generateMessagingReply: vi.fn(),
  claimInboundMessage: vi.fn(),
  recordReply: vi.fn(),
  recordUsageEvent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { clientService: { findFirst: mocks.findFirst } } }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }));
vi.mock("@/lib/subscriptions", () => ({
  consumedUnits: mocks.consumedUnits,
  calendarMonth: () => ({ start: new Date(2026, 9, 1), end: new Date(2026, 10, 1) }),
}));
vi.mock("@/lib/messaging-agent", () => ({ generateMessagingReply: mocks.generateMessagingReply }));
vi.mock("@/lib/conversations", () => ({
  claimInboundMessage: mocks.claimInboundMessage,
  recordReply: mocks.recordReply,
}));
vi.mock("@/lib/usage-events", () => ({ recordUsageEvent: mocks.recordUsageEvent }));

import {
  decideAiReply,
  findLiveClientService,
  groupByConversation,
  handleInboundMessage,
  isLiveStatus,
  isQuotaExhausted,
  parseWebhookBody,
  processInboundBatch,
  type InboundMessage,
} from "./inbound-message-guard";
import { validateInstagramSignature, validateMetaSignature } from "./meta";

const billedService = { includedUsageUnits: 3000, usageUnit: "MESSAGE" as const, overageUnitPriceCents: 25 };
const unbilledService = { ...billedService, overageUnitPriceCents: 0 };

function clientService(service = billedService, includedUsageUnits: number | null = 3000, overageAllowed = true) {
  return {
    id: "cs_1",
    overageAllowed,
    includedUsageUnits,
    configuration: {},
    organization: { name: "Boulangerie" },
    service: { slug: "whatsapp", ...service },
  } as unknown as InboundMessage["clientService"];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.checkRateLimit.mockResolvedValue(true);
  mocks.consumedUnits.mockResolvedValue(0);
  mocks.generateMessagingReply.mockResolvedValue("Bonjour !");
  mocks.claimInboundMessage.mockResolvedValue({ id: "conv_1", humanTakeover: false });
  mocks.recordReply.mockResolvedValue(undefined);
  mocks.recordUsageEvent.mockResolvedValue({ count: 0 });
});

describe("statut de la prestation", () => {
  it("ne répond que pour une prestation payée", () => {
    expect(isLiveStatus("ACTIVE")).toBe(true);
    expect(isLiveStatus("CONFIGURING")).toBe(true);
    expect(isLiveStatus("PENDING_PAYMENT")).toBe(false);
    expect(isLiveStatus("CANCELED")).toBe(false);
  });

  it("filtre la recherche par compte et par statut", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await findLiveClientService("MESSENGER", "page_1");
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { facebookPageId: "page_1", status: { in: ["CONFIGURING", "ACTIVE"] } },
      })
    );
  });
});

describe("isQuotaExhausted", () => {
  const cap = { includedUnits: 100, unit: "MESSAGE" as const, overageUnitPriceCents: 0 };

  it("bloque au forfait quand le dépassement n'est pas facturable", () => {
    expect(isQuotaExhausted(cap, 99)).toBe(false);
    expect(isQuotaExhausted(cap, 100)).toBe(true);
  });

  it("laisse passer quand le dépassement est facturé ou sans forfait", () => {
    expect(isQuotaExhausted({ ...cap, overageUnitPriceCents: 25 }, 10_000)).toBe(false);
    expect(isQuotaExhausted(null, 10_000)).toBe(false);
  });
});

describe("decideAiReply", () => {
  it("autorise un message sous toutes les limites", async () => {
    expect(await decideAiReply(clientService(), "+33600000000")).toEqual({ allowed: true });
    expect(mocks.checkRateLimit).toHaveBeenCalledWith("inbound-message-sender", "cs_1:+33600000000", "10 m", 20);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith("inbound-message-service", "cs_1", "24 h", 500);
    // Dépassement facturé : pas de comptage en base.
    expect(mocks.consumedUnits).not.toHaveBeenCalled();
  });

  it("refuse un expéditeur trop bavard sans entamer la limite de la prestation", async () => {
    mocks.checkRateLimit.mockResolvedValueOnce(false);
    expect(await decideAiReply(clientService(), "spam")).toEqual({ allowed: false, reason: "sender_rate_limited" });
    expect(mocks.checkRateLimit).toHaveBeenCalledTimes(1);
  });

  it("refuse au-delà du plafond quotidien de la prestation", async () => {
    mocks.checkRateLimit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await decideAiReply(clientService(), "c")).toEqual({ allowed: false, reason: "service_daily_cap" });
  });

  it("refuse un forfait épuisé sans prix de dépassement", async () => {
    mocks.consumedUnits.mockResolvedValue(3000);
    expect(await decideAiReply(clientService(unbilledService), "c")).toEqual({
      allowed: false,
      reason: "quota_exhausted",
    });
  });
});

describe("handleInboundMessage", () => {
  function input(send = vi.fn().mockResolvedValue(true)): InboundMessage {
    return {
      clientService: clientService(),
      channel: "WHATSAPP",
      contactId: "+33600000000",
      text: "Vous êtes ouverts ?",
      externalId: "wamid.1",
      usageType: "whatsapp_message",
      send,
    };
  }

  it("répond et enregistre la réponse", async () => {
    const send = vi.fn().mockResolvedValue(true);
    await handleInboundMessage(input(send));
    expect(send).toHaveBeenCalledWith("Bonjour !");
    expect(mocks.recordReply).toHaveBeenCalledWith("conv_1", "Bonjour !");
    expect(mocks.recordUsageEvent).toHaveBeenCalledTimes(1);
  });

  it("enregistre le message limité sans appeler l'IA ni répondre", async () => {
    mocks.checkRateLimit.mockResolvedValue(false);
    const send = vi.fn();
    await handleInboundMessage(input(send));
    expect(mocks.claimInboundMessage).toHaveBeenCalledTimes(1);
    expect(mocks.generateMessagingReply).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(mocks.recordReply).not.toHaveBeenCalled();
  });

  it("ignore un message déjà reçu", async () => {
    mocks.claimInboundMessage.mockResolvedValue(null);
    await handleInboundMessage(input());
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.generateMessagingReply).not.toHaveBeenCalled();
    expect(mocks.recordUsageEvent).not.toHaveBeenCalled();
  });

  it("se tait quand le client a repris la main", async () => {
    mocks.claimInboundMessage.mockResolvedValue({ id: "conv_1", humanTakeover: true });
    await handleInboundMessage(input());
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.generateMessagingReply).not.toHaveBeenCalled();
  });
});

describe("groupByConversation", () => {
  const m = (accountId: string, contactId: string, externalId: string) => ({ accountId, contactId, externalId });

  it("regroupe par compte et expéditeur en gardant l'ordre de réception", () => {
    const groups = groupByConversation([
      m("page_1", "alice", "1"),
      m("page_1", "bob", "2"),
      m("page_1", "alice", "3"),
      m("page_2", "alice", "4"),
      m("page_1", "bob", "5"),
    ]);
    expect(groups.map((g) => g.map((x) => x.externalId))).toEqual([["1", "3"], ["2", "5"], ["4"]]);
  });

  it("ne confond pas deux clés dont la concaténation coïncide", () => {
    expect(groupByConversation([m("a:b", "c", "1"), m("a", "b:c", "2")])).toHaveLength(2);
  });

  it("renvoie une liste vide sans message", () => {
    expect(groupByConversation([])).toEqual([]);
  });
});

describe("processInboundBatch", () => {
  it("traite chaque conversation dans l'ordre et ignore un compte sans prestation en service", async () => {
    mocks.findFirst.mockImplementation(async ({ where }: { where: { facebookPageId: string } }) =>
      where.facebookPageId === "page_1" ? clientService() : null
    );
    mocks.claimInboundMessage.mockImplementation(async ({ externalId }: { externalId: string }) => ({
      id: `conv_${externalId}`,
      humanTakeover: false,
    }));
    const send = vi.fn().mockResolvedValue(true);
    await processInboundBatch({
      channel: "MESSENGER",
      usageType: "messenger_message",
      send,
      messages: [
        { accountId: "page_1", contactId: "alice", text: "a", externalId: "m1" },
        { accountId: "page_2", contactId: "bob", text: "b", externalId: "m2" },
        { accountId: "page_1", contactId: "alice", text: "c", externalId: "m3" },
      ],
    });
    expect(mocks.findFirst).toHaveBeenCalledTimes(2);
    expect(mocks.claimInboundMessage.mock.calls.map(([arg]) => arg.externalId)).toEqual(["m1", "m3"]);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("journalise une erreur sans la propager", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findFirst.mockRejectedValue(new Error("base indisponible"));
    await expect(
      processInboundBatch({
        channel: "WHATSAPP",
        usageType: "whatsapp_message",
        send: vi.fn(),
        messages: [{ accountId: "num_1", contactId: "+33600000000", text: "a", externalId: "w1" }],
      })
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
    expect(mocks.claimInboundMessage).not.toHaveBeenCalled();
  });
});

describe("parseWebhookBody", () => {
  it("renvoie null pour un corps illisible", () => {
    expect(parseWebhookBody("{pas du json")).toBeNull();
    expect(parseWebhookBody("42")).toBeNull();
    expect(parseWebhookBody('{"entry":[]}')).toEqual({ entry: [] });
  });
});

describe("signature des webhooks Instagram", () => {
  const body = JSON.stringify({ entry: [{ id: "ig" }] });
  const sign = (secret: string) =>
    "sha256=" + crypto.createHmac("sha256", secret).update(body, "utf-8").digest("hex");

  afterEach(() => {
    delete process.env.INSTAGRAM_APP_SECRET;
    delete process.env.WHATSAPP_APP_SECRET;
  });

  it("accepte le secret de l'application Instagram ou celui de l'application Meta", () => {
    process.env.INSTAGRAM_APP_SECRET = "secret-instagram";
    process.env.WHATSAPP_APP_SECRET = "secret-meta";
    expect(validateInstagramSignature(sign("secret-instagram"), body)).toBe(true);
    expect(validateInstagramSignature(sign("secret-meta"), body)).toBe(true);
    expect(validateInstagramSignature(sign("autre"), body)).toBe(false);
  });

  it("refuse tout sans secret configuré", () => {
    expect(validateInstagramSignature(sign(""), body)).toBe(false);
    expect(validateMetaSignature(sign(""), body)).toBe(false);
  });

  it("WhatsApp et Messenger n'acceptent pas le secret Instagram", () => {
    process.env.INSTAGRAM_APP_SECRET = "secret-instagram";
    expect(validateMetaSignature(sign("secret-instagram"), body)).toBe(false);
  });

  it("met l'assistant en pause au forfait quand le client a refusé le dépassement", () => {
    const cap = { includedUnits: 100, unit: "MESSAGE", overageUnitPriceCents: 5 } as unknown as Parameters<typeof isQuotaExhausted>[0];
    expect(isQuotaExhausted(cap, 100, true)).toBe(false);
    expect(isQuotaExhausted(cap, 100, false)).toBe(true);
    expect(isQuotaExhausted(cap, 99, false)).toBe(false);
  });
});
