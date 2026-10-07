import { describe, expect, it } from "vitest";
import {
  MAX_DURATION_SEC,
  MAX_EXTERNAL_ID_LENGTH,
  MAX_METADATA_BYTES,
  parseUsageEventBody,
} from "./usage-event-body";

const NOW = new Date("2026-10-07T10:00:00Z");
const base = { clientServiceId: "clx0123456789" };

function error(body: unknown) {
  const result = parseUsageEventBody(body, NOW);
  return result.ok ? null : result.error;
}

describe("parseUsageEventBody", () => {
  it("applique les valeurs par défaut", () => {
    expect(parseUsageEventBody(base, NOW)).toEqual({
      ok: true,
      value: {
        clientServiceId: base.clientServiceId,
        type: "call",
        externalId: null,
        status: "completed",
        occurredAt: NOW,
        durationSec: null,
        metadata: undefined,
      },
    });
  });

  it("accepte un événement complet et valide", () => {
    const result = parseUsageEventBody(
      {
        ...base,
        type: "whatsapp_message",
        externalId: "ext-1",
        status: "in_progress",
        occurredAt: "2026-10-01T08:00:00Z",
        durationSec: MAX_DURATION_SEC,
        metadata: { from: "+33600000000" },
      },
      NOW
    );
    expect(result.ok).toBe(true);
  });

  it("refuse un corps absent ou qui n'est pas un objet", () => {
    expect(error(null)).not.toBeNull();
    expect(error([base])).not.toBeNull();
    expect(error("texte")).not.toBeNull();
  });

  it("exige clientServiceId", () => {
    expect(error({})).toBe("clientServiceId is required");
    expect(error({ clientServiceId: 42 })).toBe("clientServiceId is required");
  });

  it("refuse une durée non entière, négative, infinie ou supérieure à un jour", () => {
    for (const durationSec of [1.5, -1, MAX_DURATION_SEC + 1, Infinity, NaN, "60"]) {
      expect(error({ ...base, durationSec })).toBe("Invalid durationSec");
    }
    expect(error({ ...base, durationSec: 0 })).toBeNull();
  });

  it("refuse un externalId trop long ou qui n'est pas une chaîne", () => {
    expect(error({ ...base, externalId: "x".repeat(MAX_EXTERNAL_ID_LENGTH + 1) })).toBe(
      "Invalid externalId"
    );
    expect(error({ ...base, externalId: 12 })).toBe("Invalid externalId");
    expect(error({ ...base, externalId: "x".repeat(MAX_EXTERNAL_ID_LENGTH) })).toBeNull();
  });

  it("refuse des métadonnées de plus de 10 Ko ou qui ne sont pas un objet JSON", () => {
    expect(error({ ...base, metadata: { blob: "x".repeat(MAX_METADATA_BYTES) } })).toBe(
      "metadata too large"
    );
    expect(error({ ...base, metadata: "texte" })).toBe("Invalid metadata");
  });

  it("refuse un type ou un statut inconnu", () => {
    expect(error({ ...base, type: "sms" })).toBe("Invalid type");
    expect(error({ ...base, status: "failed" })).toBe("Invalid status");
  });

  it("refuse une date illisible", () => {
    expect(error({ ...base, occurredAt: "hier" })).toBe("Invalid occurredAt");
    expect(error({ ...base, occurredAt: 1234 })).toBe("Invalid occurredAt");
  });
});
