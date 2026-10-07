import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { recordUsageEvent } from "@/lib/usage-events";
import { parseUsageEventBody } from "@/lib/usage-event-body";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function isAuthorized(request: Request): boolean {
  const secret = process.env.USAGE_EVENTS_API_KEY;
  if (!secret) return false;
  const received = Buffer.from(request.headers.get("x-api-key") ?? "");
  const expected = Buffer.from(secret);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  const allowed = await checkRateLimit("usage-events", await getClientIp(), "1 m", 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseUsageEventBody(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const { count } = await recordUsageEvent(parsed.value);
    return NextResponse.json({ count }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unknown clientServiceId" }, { status: 404 });
  }
}
