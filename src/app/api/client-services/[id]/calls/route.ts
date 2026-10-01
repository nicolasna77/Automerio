import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { assertCanReadClientService } from "@/lib/client-service-access";
import { parisDayKey, parisDayRange } from "@/lib/paris-day";

const RECENT_LIMIT = 15;
const PENDING_LIMIT = 50;
const FILTERED_LIMIT = 200;
// Jours proposés dans le filtre : les 60 derniers.
const DAYS_WINDOW = 60;

function readMetadata(metadata: unknown) {
  const m = (metadata ?? {}) as Record<string, unknown>;
  return {
    fromNumber: typeof m.fromNumber === "string" ? m.fromNumber : null,
    outcome: typeof m.outcome === "string" ? m.outcome : null,
    endedReason: typeof m.endedReason === "string" ? m.endedReason : null,
  };
}

type CallStatusFilter = "all" | "todo" | "done";

function readStatus(value: string | null): CallStatusFilter {
  return value === "todo" || value === "done" ? value : "all";
}

// Liste des appels d'une solution, filtrable par jour (heure de Paris) et par
// état : « todo » = un rappel est demandé et pas encore fait, « done » =
// marqué comme traité. Sans filtre : les derniers appels, plus tous ceux qui
// attendent encore un geste.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await assertCanReadClientService(id, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const search = new URL(request.url).searchParams;
  const dayParam = search.get("day");
  const day = dayParam ? parisDayRange(dayParam) : null;
  if (dayParam && !day) {
    return NextResponse.json({ error: "Jour invalide" }, { status: 400 });
  }
  const status = readStatus(search.get("status"));

  const completed = { clientServiceId: id, type: "call", status: "completed" } as const;
  const todo = { handledAt: null, callSummary: { followUp: { not: null } } } as const;
  const done = { handledAt: { not: null } } as const;
  const statusWhere = status === "todo" ? todo : status === "done" ? done : {};
  const summaryInclude = {
    callSummary: { select: { reason: true, summary: true, followUp: true, callerName: true } },
  } as const;

  const recentQuery = async () => {
    if (day || status !== "all") {
      return db.usageEvent.findMany({
        where: { ...completed, ...statusWhere, ...(day && { occurredAt: day }) },
        orderBy: { occurredAt: "desc" },
        take: FILTERED_LIMIT,
        include: summaryInclude,
      });
    }
    const [latestRows, pendingRows] = await Promise.all([
      db.usageEvent.findMany({
        where: completed,
        orderBy: { occurredAt: "desc" },
        take: RECENT_LIMIT,
        include: summaryInclude,
      }),
      db.usageEvent.findMany({
        where: { ...completed, ...todo },
        orderBy: { occurredAt: "desc" },
        take: PENDING_LIMIT,
        include: summaryInclude,
      }),
    ]);
    const latestIds = new Set(latestRows.map((row) => row.id));
    return [...latestRows, ...pendingRows.filter((row) => !latestIds.has(row.id))].toSorted(
      (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()
    );
  };

  const since = new Date(Date.now() - DAYS_WINDOW * 86_400_000);
  const [inProgressRows, recentRows, pendingCount, windowRows] = await Promise.all([
    db.usageEvent.findMany({
      where: { clientServiceId: id, type: "call", status: "in_progress" },
      orderBy: { occurredAt: "desc" },
    }),
    recentQuery(),
    db.usageEvent.count({ where: { ...completed, ...todo } }),
    db.usageEvent.findMany({
      where: { ...completed, occurredAt: { gte: since } },
      select: { occurredAt: true },
    }),
  ]);

  // Jours qui ont reçu des appels, du plus récent au plus ancien, pour le
  // filtre par jour.
  const dayCounts = new Map<string, number>();
  for (const row of windowRows) {
    const key = parisDayKey(row.occurredAt);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }
  const days = [...dayCounts.entries()]
    .toSorted(([a], [b]) => b.localeCompare(a))
    .map(([key, count]) => ({ day: key, count }));

  return NextResponse.json({
    inProgress: inProgressRows.map((row) => ({
      id: row.id,
      startedAt: row.occurredAt.toISOString(),
      ...readMetadata(row.metadata),
    })),
    recent: recentRows.map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
      durationSec: row.durationSec,
      ...readMetadata(row.metadata),
      summary: row.callSummary,
      handled: row.handledAt !== null,
    })),
    pendingCount,
    days,
    truncated: (day !== null || status !== "all") && recentRows.length === FILTERED_LIMIT,
  });
}
