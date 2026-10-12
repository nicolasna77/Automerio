import { escapeXml } from "@/lib/demo-call";

// Rappel en un clic : Twilio appelle d'abord le mobile du professionnel, lui
// annonce le rappel, puis compose l'appelant en présentant le numéro de la
// solution. Le numéro personnel du professionnel n'est jamais montré.

export const CALLBACKS_PER_DAY = 20;
// Durée maximale d'un rappel (secondes), annonce comprise.
export const CALLBACK_TIME_LIMIT_SEC = 30 * 60;

export function buildBridgeTwiml(input: { announce: string; customerNumber: string; callerId: string }): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Response>`,
    `<Say language="fr-FR">${escapeXml(input.announce)}</Say>`,
    `<Dial callerId="${escapeXml(input.callerId)}" timeLimit="${CALLBACK_TIME_LIMIT_SEC}">`,
    `<Number>${escapeXml(input.customerNumber)}</Number>`,
    `</Dial>`,
    `</Response>`,
  ].join("");
}
