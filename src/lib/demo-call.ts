import { createHmac } from "node:crypto";

/**
 * Appel d'essai : un visiteur du site public laisse son numero, et l'agent
 * vocal d'Automerio l'appelle pour se presenter.
 *
 * Appeler un numero saisi par un inconnu coute de l'argent et peut servir a
 * harceler un tiers. D'ou les garde-fous, tous cote serveur : numeros francais
 * geographiques ou mobiles seulement (pas de numeros surtaxes), un seul essai
 * par numero et pour toujours, un plafond par adresse IP et par jour, et une
 * duree coupee par Twilio lui-meme.
 */

/** Le temps de parole accorde : assez pour une presentation et deux questions. */
export const DEMO_TIME_LIMIT_SEC = 180;

/** L'en-tete SIP qui signale au webhook OpenAI qu'il s'agit d'un essai. */
export const DEMO_SIP_HEADER = "X-Automerio-Demo";

/**
 * L'en-tete d'un appel de test lance par un client depuis son tableau de bord :
 * l'agent y parle avec la configuration de sa solution, pas en vendeur.
 */
export const TEST_SIP_HEADER = "X-Automerio-Test";

/** Nombre d'appels de test qu'une solution peut demander par 24 h. */
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

/**
 * Mode sans appel reel : tout le parcours s'execute (validation, limites,
 * enregistrement), seul l'appel Twilio est saute. Pour les tests et le
 * developpement local.
 */
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

/**
 * Ramene un numero francais saisi librement au format E.164, ou `null`.
 *
 * Seuls passent les numeros geographiques (01 a 05), mobiles (06, 07) et
 * non geographiques en 09. Les 08 (dont les surtaxes) et les numeros courts
 * sont refuses : l'essai ne doit jamais couter plus qu'un appel ordinaire.
 */
export function normalizeFrenchPhone(input: string): string | null {
  let digits = input.replace(/[\s.\-()]/g, "");
  if (digits.startsWith("+33")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("0033")) digits = `0${digits.slice(4)}`;

  if (!/^0[1-79]\d{8}$/.test(digits)) return null;
  return `+33${digits.slice(1)}`;
}

/** Affichage lisible d'un numero E.164 francais : `06 12 34 56 78`. */
export function formatFrenchPhone(e164: string): string {
  return `0${e164.slice(3)}`.replace(/(\d{2})(?=\d)/g, "$1 ");
}

function hmac(value: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET manquant");
  return createHmac("sha256", secret).update(value).digest("hex");
}

/**
 * L'empreinte d'un numero : de quoi reconnaitre un numero deja appele sans le
 * conserver. Le secret empeche de retrouver un numero en essayant les ~10^9
 * possibles, ce qu'un simple SHA-256 permettrait en quelques minutes.
 */
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

/**
 * La TwiML de l'appel sortant : des que le visiteur decroche, Twilio relie
 * l'appel a l'agent OpenAI en ajoutant l'identifiant de l'essai en en-tete
 * SIP personnalise.
 */
export function buildDemoTwiml(sipUri: string, callId: string, header: string = DEMO_SIP_HEADER): string {
  const separator = sipUri.includes("?") ? "&" : "?";
  const target = `${sipUri}${separator}${header}=${encodeURIComponent(callId)}`;
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Sip>${escapeXml(target)}</Sip></Dial></Response>`;
}

/** L'identifiant porte par un en-tete SIP d'un appel entrant, s'il y en a un. */
export function readDemoCallId(
  headers: { name: string; value: string }[],
  headerName: string = DEMO_SIP_HEADER
): string | null {
  const header = headers.find((h) => h.name.toLowerCase() === headerName.toLowerCase());
  const value = header?.value.trim();
  return value && /^[a-z0-9]{10,40}$/i.test(value) ? value : null;
}
