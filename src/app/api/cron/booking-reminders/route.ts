import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendBookingReminders } from "@/lib/booking-sms";

export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

// Tâche planifiée Vercel, chaque jour en fin d'après-midi : SMS de rappel
// pour les rendez-vous du lendemain (src/lib/booking-sms.ts).
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendBookingReminders();
  console.info(`[rappels] envoyés : ${result.sent}, ignorés : ${result.skipped}`);
  return NextResponse.json(result);
}
