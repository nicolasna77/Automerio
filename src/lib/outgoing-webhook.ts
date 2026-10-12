import { createHmac, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { db } from "@/lib/db";

// Webhook sortant : chaque appel terminé et chaque réservation partent vers
// l'adresse choisie par le client (Zapier, Make, son CRM). Le client choisit
// l'adresse, donc tout est borné : https seulement, jamais vers le réseau
// interne (adresse revérifiée à chaque envoi), pas de redirection suivie,
// 5 secondes au plus, et un envoi qui échoue ne fait jamais échouer l'appel.

export type WebhookEvent =
  | "call.completed"
  | "booking.created"
  | "booking.canceled"
  | "booking.rescheduled"
  | "test";

export type WebhookUrlCheck =
  | { ok: true; url: string }
  | { ok: false; reason: "format" | "https" | "private" };

const TIMEOUT_MS = 5_000;
const MAX_URL_LENGTH = 2_000;

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

// Adresses privées, locales ou réservées (IPv4 et IPv6, IPv4 mappée comprise).
export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, "");
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (isIP(ip) === 6) {
    return (
      ip === "::" ||
      ip === "::1" ||
      ip.startsWith("fc") ||
      ip.startsWith("fd") ||
      ip.startsWith("fe8") ||
      ip.startsWith("fe9") ||
      ip.startsWith("fea") ||
      ip.startsWith("feb") ||
      ip.startsWith("ff")
    );
  }
  return true;
}

export async function checkWebhookUrl(raw: string): Promise<WebhookUrlCheck> {
  const value = raw.trim();
  if (!value || value.length > MAX_URL_LENGTH) return { ok: false, reason: "format" };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "format" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "https" };
  if (url.username || url.password || (url.port && url.port !== "443")) return { ok: false, reason: "format" };

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, reason: "private" };
  }
  let addresses: string[];
  try {
    addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((entry) => entry.address);
  } catch {
    return { ok: false, reason: "format" };
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) return { ok: false, reason: "private" };
  return { ok: true, url: url.toString() };
}

// En-tête X-Automerio-Signature : « sha256=<hex> » du HMAC de
// « <horodatage>.<corps> », pour que le client vérifie l'origine et refuse
// un envoi rejoué (horodatage trop ancien).
export function signWebhook(secret: string, timestamp: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

export async function postWebhook(input: {
  url: string;
  secret: string;
  event: WebhookEvent;
  clientServiceId: string;
  data: Record<string, unknown>;
}): Promise<{ ok: boolean; status: number | null }> {
  const check = await checkWebhookUrl(input.url);
  if (!check.ok) return { ok: false, status: null };

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({
    event: input.event,
    occurredAt: new Date().toISOString(),
    clientServiceId: input.clientServiceId,
    data: input.data,
  });
  try {
    const response = await fetch(check.url, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Automerio-Webhook/1",
        "X-Automerio-Event": input.event,
        "X-Automerio-Timestamp": timestamp,
        "X-Automerio-Signature": signWebhook(input.secret, timestamp, body),
      },
      body,
    });
    return { ok: response.status >= 200 && response.status < 300, status: response.status };
  } catch {
    return { ok: false, status: null };
  }
}

// Envoi d'un événement de la solution, si un webhook est réglé. Ne lève
// jamais d'erreur : l'appel ou la réservation qui l'a déclenché est déjà fait.
export async function deliverWebhook(
  clientServiceId: string,
  event: Exclude<WebhookEvent, "test">,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const clientService = await db.clientService.findUnique({
      where: { id: clientServiceId },
      select: { webhookUrl: true, webhookSecret: true },
    });
    if (!clientService?.webhookUrl || !clientService.webhookSecret) return;
    const result = await postWebhook({
      url: clientService.webhookUrl,
      secret: clientService.webhookSecret,
      event,
      clientServiceId,
      data,
    });
    if (!result.ok) {
      console.warn(`[webhook] ${event} refusé pour ${clientServiceId} (statut ${result.status ?? "aucun"}).`);
    }
  } catch (err) {
    console.error(`[webhook] ${event} impossible pour ${clientServiceId} :`, err);
  }
}
