import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendWeeklyDigests } from "@/lib/weekly-digest";

export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendWeeklyDigests();
  console.info(`[bilan] envoyés : ${result.sent}, semaines vides : ${result.empty}, déjà traités : ${result.skipped}`);
  return NextResponse.json(result);
}
