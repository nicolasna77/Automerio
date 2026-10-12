import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { usageEvent: { create } } }));

import { MISSED_CALL_TYPE, readMissedReason, recordMissedCall } from "./missed-calls";

beforeEach(() => {
  create.mockReset();
});

describe("recordMissedCall", () => {
  it("enregistre l'appel sous un type à part, jamais compté dans le forfait", async () => {
    create.mockResolvedValue({});
    await recordMissedCall({ clientServiceId: "cs", callSid: "CA123", from: "+33612345678", reason: "quota" });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientServiceId: "cs",
        type: MISSED_CALL_TYPE,
        status: "completed",
        durationSec: 0,
        externalId: "CA123",
        metadata: { fromNumber: "+33612345678", missedReason: "quota" },
      }),
    });
    expect(MISSED_CALL_TYPE).not.toBe("call");
  });

  it("ignore un webhook rejoué (même CallSid)", async () => {
    create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("doublon", { code: "P2002", clientVersion: "7" }));
    await expect(
      recordMissedCall({ clientServiceId: "cs", callSid: "CA123", from: null, reason: "paused" })
    ).resolves.toBeUndefined();
  });
});

describe("readMissedReason", () => {
  it("ne lit que les motifs connus", () => {
    expect(readMissedReason({ missedReason: "paused" })).toBe("paused");
    expect(readMissedReason({ missedReason: "autre" })).toBeNull();
    expect(readMissedReason(null)).toBeNull();
  });
});
