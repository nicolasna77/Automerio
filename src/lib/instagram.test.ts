import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  logServiceEvent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { clientService: { findFirst: mocks.findFirst, update: mocks.update } },
}));
vi.mock("@/lib/service-events", () => ({ logServiceEvent: mocks.logServiceEvent }));
vi.mock("@/lib/env", () => ({ requireEnv: (name: string) => `valeur-${name}` }));

import { completeInstagramConnection, InstagramAccountInUseError } from "./instagram";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const body = url.includes("oauth/access_token")
        ? { access_token: "court", user_id: "17841400000000000" }
        : url.includes("/access_token?")
          ? { access_token: "long", expires_in: 3600 }
          : { username: "boutique" };
      return new Response(JSON.stringify(body), { status: 200 });
    })
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("completeInstagramConnection", () => {
  it("enregistre le compte quand il n'est relié à aucune autre solution", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.update.mockResolvedValue({});

    await completeInstagramConnection("cs_1", "code");

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { instagramAccountId: "17841400000000000", id: { not: "cs_1" } },
      select: { id: true },
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cs_1" },
        data: expect.objectContaining({ instagramAccountId: "17841400000000000", instagramUsername: "boutique" }),
      })
    );
    expect(mocks.logServiceEvent).toHaveBeenCalledWith("cs_1", "INSTAGRAM_CONNECTED", "boutique");
  });

  it("refuse un compte déjà relié à une autre solution", async () => {
    mocks.findFirst.mockResolvedValue({ id: "cs_autre" });

    await expect(completeInstagramConnection("cs_1", "code")).rejects.toBeInstanceOf(
      InstagramAccountInUseError
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("traduit une violation d'unicité (connexion concurrente) en compte déjà utilisé", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("doublon", { code: "P2002", clientVersion: "test" })
    );

    await expect(completeInstagramConnection("cs_1", "code")).rejects.toBeInstanceOf(
      InstagramAccountInUseError
    );
    expect(mocks.logServiceEvent).not.toHaveBeenCalled();
  });

  it("laisse passer les autres erreurs telles quelles", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.update.mockRejectedValue(new Error("base indisponible"));

    await expect(completeInstagramConnection("cs_1", "code")).rejects.toThrow("base indisponible");
  });
});
