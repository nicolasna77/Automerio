import type { ClientServiceStatus } from "@prisma/client";
import { LIVE_STATUSES } from "@/lib/catalog";
import { isPausedByQuota } from "@/lib/overage-billing";

// L'assistant décroche-t-il ? Même règle à l'entrée Twilio
// (/api/voice/incoming) et à l'entrée OpenAI (/api/voice/openai-webhook) :
// un appel qui arriverait directement sur l'URI SIP ne doit pas contourner
// la pause, le statut ou le quota. Même liste de statuts que la messagerie
// (LIVE_STATUSES) : une solution non payée ou résiliée ne répond pas.
export type CallRefusal = "not_live" | "paused" | "quota";

type GateColumns = Parameters<typeof isPausedByQuota>[0] & {
  status: ClientServiceStatus;
  pausedAt: Date | null;
};

export function refusalBeforeQuota(clientService: Pick<GateColumns, "status" | "pausedAt">): CallRefusal | null {
  if (!(LIVE_STATUSES as readonly ClientServiceStatus[]).includes(clientService.status)) return "not_live";
  if (clientService.pausedAt) return "paused";
  return null;
}

export async function callRefusal(clientService: GateColumns): Promise<CallRefusal | null> {
  const refusal = refusalBeforeQuota(clientService);
  if (refusal) return refusal;
  return (await isPausedByQuota(clientService)) ? "quota" : null;
}
