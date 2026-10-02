import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { assertCanReadClientService } from "@/lib/client-service-access";
import { getConversationDays, getConversations } from "@/lib/conversations";
import { parisDayRange } from "@/lib/paris-day";

// Consultée en polling par la messagerie du tableau de bord ; « ?day=AAAA-MM-JJ »
// ne garde que les conversations actives ce jour-là (heure de Paris).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await assertCanReadClientService(id, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dayParam = new URL(request.url).searchParams.get("day");
  const day = dayParam ? parisDayRange(dayParam) : null;
  if (dayParam && !day) {
    return NextResponse.json({ error: "Jour invalide" }, { status: 400 });
  }

  const [conversations, days] = await Promise.all([getConversations(id, day), getConversationDays(id)]);
  return NextResponse.json({ conversations, days });
}
