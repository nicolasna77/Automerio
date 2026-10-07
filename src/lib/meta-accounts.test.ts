import { afterEach, describe, expect, it, vi } from "vitest";
import { isGraphId, listContainsId, pageBelongsToToken, whatsAppNumberBelongsToToken } from "./meta-accounts";

function mockGraph(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string) => {
    const path = new URL(url).pathname.replace(/^\/v[\d.]+/, "");
    const body = routes[path];
    return body === undefined
      ? new Response("{}", { status: 400 })
      : new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("isGraphId", () => {
  it("n'accepte que des identifiants numériques", () => {
    expect(isGraphId("1234567890")).toBe(true);
    expect(isGraphId("123/../me")).toBe(false);
    expect(isGraphId("123?fields=x")).toBe(false);
    expect(isGraphId("")).toBe(false);
    expect(isGraphId(42)).toBe(false);
  });
});

describe("listContainsId", () => {
  it("cherche l'identifiant exact", () => {
    expect(listContainsId({ data: [{ id: "1" }, { id: "22" }] }, "22")).toBe(true);
    expect(listContainsId({ data: [{ id: "222" }] }, "22")).toBe(false);
    expect(listContainsId({}, "22")).toBe(false);
  });
});

describe("whatsAppNumberBelongsToToken", () => {
  it("accepte un numéro du WABA accessible avec le jeton", async () => {
    const fetchMock = mockGraph({ "/111": { id: "111" }, "/111/phone_numbers": { data: [{ id: "999" }] } });
    await expect(whatsAppNumberBelongsToToken("111", "999", "jeton")).resolves.toBe(true);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toEqual({ Authorization: "Bearer jeton" });
  });

  it("refuse un numéro qui n'appartient pas au WABA", async () => {
    mockGraph({ "/111": { id: "111" }, "/111/phone_numbers": { data: [{ id: "998" }] } });
    await expect(whatsAppNumberBelongsToToken("111", "999", "jeton")).resolves.toBe(false);
  });

  it("refuse un WABA inaccessible avec le jeton", async () => {
    mockGraph({ "/111/phone_numbers": { data: [{ id: "999" }] } });
    await expect(whatsAppNumberBelongsToToken("111", "999", "jeton")).resolves.toBe(false);
  });

  it("suit la pagination de Graph", async () => {
    mockGraph({
      "/111": { id: "111" },
      "/111/phone_numbers": { data: [{ id: "1" }], paging: { next: "https://graph.facebook.com/v21.0/page2" } },
      "/page2": { data: [{ id: "999" }] },
    });
    await expect(whatsAppNumberBelongsToToken("111", "999", "jeton")).resolves.toBe(true);
  });

  it("refuse des identifiants mal formés sans appeler Graph", async () => {
    const fetchMock = mockGraph({});
    await expect(whatsAppNumberBelongsToToken("111/..", "999", "jeton")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("pageBelongsToToken", () => {
  it("vérifie la Page dans /me/accounts", async () => {
    mockGraph({ "/me/accounts": { data: [{ id: "555" }] } });
    await expect(pageBelongsToToken("555", "jeton")).resolves.toBe(true);
    await expect(pageBelongsToToken("556", "jeton")).resolves.toBe(false);
  });
});
