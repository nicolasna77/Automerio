import type { Prisma } from "@prisma/client";

// Types d'usage connus : ceux écrits par les webhooks de messagerie et par
// l'agent vocal. Tout autre type est refusé plutôt que stocké tel quel.
export const USAGE_EVENT_TYPES = [
  "call",
  "instagram_message",
  "messenger_message",
  "whatsapp_message",
] as const;
export type UsageEventType = (typeof USAGE_EVENT_TYPES)[number];

export const MAX_DURATION_SEC = 86_400;
export const MAX_EXTERNAL_ID_LENGTH = 200;
export const MAX_METADATA_BYTES = 10 * 1024;

export type UsageEventBody = {
  clientServiceId: string;
  type: UsageEventType;
  externalId: string | null;
  status: "in_progress" | "completed";
  occurredAt: Date;
  durationSec: number | null;
  metadata: Prisma.InputJsonValue | undefined;
};

export type ParseResult =
  | { ok: true; value: UsageEventBody }
  | { ok: false; error: string };

function isUsageEventType(value: unknown): value is UsageEventType {
  return (USAGE_EVENT_TYPES as readonly unknown[]).includes(value);
}

export function parseUsageEventBody(body: unknown, now: Date = new Date()): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Invalid body" };
  }
  const input = body as Record<string, unknown>;

  const { clientServiceId } = input;
  if (typeof clientServiceId !== "string" || clientServiceId.length === 0) {
    return { ok: false, error: "clientServiceId is required" };
  }
  if (clientServiceId.length > MAX_EXTERNAL_ID_LENGTH) {
    return { ok: false, error: "Invalid clientServiceId" };
  }

  let type: UsageEventType = "call";
  if (input.type !== undefined) {
    if (!isUsageEventType(input.type)) return { ok: false, error: "Invalid type" };
    type = input.type;
  }

  let status: UsageEventBody["status"] = "completed";
  if (input.status !== undefined) {
    if (input.status !== "in_progress" && input.status !== "completed") {
      return { ok: false, error: "Invalid status" };
    }
    status = input.status;
  }

  let occurredAt = now;
  if (input.occurredAt !== undefined) {
    if (typeof input.occurredAt !== "string") return { ok: false, error: "Invalid occurredAt" };
    occurredAt = new Date(input.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) return { ok: false, error: "Invalid occurredAt" };
  }

  let externalId: string | null = null;
  if (input.externalId !== undefined && input.externalId !== null) {
    if (
      typeof input.externalId !== "string" ||
      input.externalId.length === 0 ||
      input.externalId.length > MAX_EXTERNAL_ID_LENGTH
    ) {
      return { ok: false, error: "Invalid externalId" };
    }
    externalId = input.externalId;
  }

  let durationSec: number | null = null;
  if (input.durationSec !== undefined && input.durationSec !== null) {
    const d = input.durationSec;
    if (typeof d !== "number" || !Number.isInteger(d) || d < 0 || d > MAX_DURATION_SEC) {
      return { ok: false, error: "Invalid durationSec" };
    }
    durationSec = d;
  }

  let metadata: Prisma.InputJsonValue | undefined;
  if (input.metadata !== undefined && input.metadata !== null) {
    if (typeof input.metadata !== "object") return { ok: false, error: "Invalid metadata" };
    const serialized = JSON.stringify(input.metadata);
    if (Buffer.byteLength(serialized, "utf8") > MAX_METADATA_BYTES) {
      return { ok: false, error: "metadata too large" };
    }
    metadata = input.metadata as Prisma.InputJsonValue;
  }

  return {
    ok: true,
    value: { clientServiceId, type, externalId, status, occurredAt, durationSec, metadata },
  };
}
