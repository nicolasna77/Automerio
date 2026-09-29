import { createHmac } from "node:crypto";

export const DEMO_TIME_LIMIT_SEC = 180;

export const DEMO_SIP_HEADER = "X-Automerio-Demo";

export const TEST_SIP_HEADER = "X-Automerio-Test";

export const TEST_CALLS_PER_DAY = 5;

const DEFAULT_PER_IP_PER_DAY = 2;
const DEFAULT_PER_DAY = 30;

function positiveIntFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function demoCallLimits() {
  return {
    perIpPerDay: positiveIntFromEnv("DEMO_CALLS_PER_IP_PER_DAY", DEFAULT_PER_IP_PER_DAY),
    perDay: positiveIntFromEnv("DEMO_CALLS_PER_DAY", DEFAULT_PER_DAY),
  };
}

export function isDemoCallDryRun(): boolean {
  return process.env.DEMO_CALL_DRY_RUN === "true";
}

export function isDemoCallAvailable(): boolean {
  if (isDemoCallDryRun()) return true;
  return [
    "DEMO_CALLER_NUMBER",
    "OPENAI_SIP_URI",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_API_KEY_SID",
    "TWILIO_API_KEY_SECRET",
  ].every((name) => Boolean(process.env[name]?.trim()));
}

export function normalizeFrenchPhone(input: string): string | null {
  let digits = input.replace(/[\s.\-()]/g, "");
  if (digits.startsWith("+33")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("0033")) digits = `0${digits.slice(4)}`;

  if (!/^0[1-79]\d{8}$/.test(digits)) return null;
  return `+33${digits.slice(1)}`;
}

export { formatFrenchPhone } from "@/lib/phone-format";

function hmac(value: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET manquant");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function hashPhone(e164: string): string {
  return hmac(`phone:${e164}`);
}

export function hashIp(ip: string): string {
  return hmac(`ip:${ip}`);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildDemoTwiml(sipUri: string, callId: string, header: string = DEMO_SIP_HEADER): string {
  const separator = sipUri.includes("?") ? "&" : "?";
  const target = `${sipUri}${separator}${header}=${encodeURIComponent(callId)}`;
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Sip>${escapeXml(target)}</Sip></Dial></Response>`;
}

export function readDemoCallId(
  headers: { name: string; value: string }[],
  headerName: string = DEMO_SIP_HEADER
): string | null {
  const header = headers.find((h) => h.name.toLowerCase() === headerName.toLowerCase());
  const value = header?.value.trim();
  return value && /^[a-z0-9]{10,40}$/i.test(value) ? value : null;
}
