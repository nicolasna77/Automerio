import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), findUnique: vi.fn() }));

vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("@/lib/db", () => ({ db: { clientService: { findUnique: mocks.findUnique } } }));

import { checkWebhookUrl, deliverWebhook, isPrivateAddress, postWebhook, signWebhook } from "./outgoing-webhook";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isPrivateAddress", () => {
  it("repère les réseaux privés, locaux et réservés", () => {
    for (const ip of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.5.4", "192.168.1.1", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("laisse passer une adresse publique", () => {
    expect(isPrivateAddress("93.184.216.34")).toBe(false);
    expect(isPrivateAddress("2606:2800:220:1::1")).toBe(false);
  });
});

describe("checkWebhookUrl", () => {
  it("accepte une adresse https publique", async () => {
    expect(await checkWebhookUrl(" https://hooks.example.com/abc ")).toEqual({ ok: true, url: "https://hooks.example.com/abc" });
  });

  it("refuse http, un format invalide, un port ou des identifiants", async () => {
    expect(await checkWebhookUrl("http://hooks.example.com")).toEqual({ ok: false, reason: "https" });
    expect(await checkWebhookUrl("pas une adresse")).toEqual({ ok: false, reason: "format" });
    expect(await checkWebhookUrl("https://hooks.example.com:8443/x")).toEqual({ ok: false, reason: "format" });
    expect(await checkWebhookUrl("https://user:pass@hooks.example.com/x")).toEqual({ ok: false, reason: "format" });
  });

  it("refuse un nom qui pointe vers le réseau interne", async () => {
    expect(await checkWebhookUrl("https://localhost/x")).toEqual({ ok: false, reason: "private" });
    expect(await checkWebhookUrl("https://169.254.169.254/latest")).toEqual({ ok: false, reason: "private" });
    mocks.lookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ]);
    expect(await checkWebhookUrl("https://rebind.example.com")).toEqual({ ok: false, reason: "private" });
  });
});

describe("postWebhook", () => {
  it("signe le corps avec l'horodatage et ne suit pas les redirections", async () => {
    fetchMock.mockResolvedValue({ status: 200 });
    const result = await postWebhook({
      url: "https://hooks.example.com/abc",
      secret: "s3cret",
      event: "test",
      clientServiceId: "cs",
      data: { message: "Test" },
    });
    expect(result).toEqual({ ok: true, status: 200 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.example.com/abc");
    expect(init.redirect).toBe("manual");
    const timestamp = init.headers["X-Automerio-Timestamp"];
    const expected = `sha256=${createHmac("sha256", "s3cret").update(`${timestamp}.${init.body}`).digest("hex")}`;
    expect(init.headers["X-Automerio-Signature"]).toBe(expected);
    expect(signWebhook("s3cret", timestamp, init.body)).toBe(expected);
    expect(JSON.parse(init.body)).toMatchObject({ event: "test", clientServiceId: "cs", data: { message: "Test" } });
  });

  it("traite une redirection ou une erreur réseau comme un échec", async () => {
    fetchMock.mockResolvedValueOnce({ status: 302 });
    expect((await postWebhook({ url: "https://hooks.example.com", secret: "s", event: "test", clientServiceId: "cs", data: {} })).ok).toBe(false);
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    expect(await postWebhook({ url: "https://hooks.example.com", secret: "s", event: "test", clientServiceId: "cs", data: {} })).toEqual({ ok: false, status: null });
  });

  it("n'envoie rien vers une adresse devenue privée", async () => {
    mocks.lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    expect(await postWebhook({ url: "https://hooks.example.com", secret: "s", event: "test", clientServiceId: "cs", data: {} })).toEqual({ ok: false, status: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("deliverWebhook", () => {
  it("ne fait rien sans webhook réglé", async () => {
    mocks.findUnique.mockResolvedValue({ webhookUrl: null, webhookSecret: null });
    await deliverWebhook("cs", "call.completed", {});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ne lève jamais d'erreur", async () => {
    mocks.findUnique.mockRejectedValue(new Error("base indisponible"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(deliverWebhook("cs", "booking.created", {})).resolves.toBeUndefined();
  });
});
