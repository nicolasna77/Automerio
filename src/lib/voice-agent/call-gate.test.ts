import { describe, expect, it } from "vitest";
import { refusalBeforeQuota } from "./call-gate";

describe("refusalBeforeQuota", () => {
  it("laisse décrocher une solution payée et en service", () => {
    expect(refusalBeforeQuota({ status: "ACTIVE", pausedAt: null })).toBeNull();
    expect(refusalBeforeQuota({ status: "CONFIGURING", pausedAt: null })).toBeNull();
  });

  it("refuse une solution non payée ou résiliée", () => {
    expect(refusalBeforeQuota({ status: "PENDING_PAYMENT", pausedAt: null })).toBe("not_live");
    expect(refusalBeforeQuota({ status: "CANCELED", pausedAt: null })).toBe("not_live");
  });

  it("refuse une solution mise en pause", () => {
    expect(refusalBeforeQuota({ status: "ACTIVE", pausedAt: new Date() })).toBe("paused");
  });
});
