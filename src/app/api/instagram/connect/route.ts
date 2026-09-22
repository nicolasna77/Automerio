import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canReadClientService, viewerOf } from "@/lib/client-service-access";
import { requireUser } from "@/lib/session";
import { buildInstagramAuthUrl } from "@/lib/instagram";

export async function GET(request: Request) {
  const session = await requireUser();

  const clientServiceId = new URL(request.url).searchParams.get("clientServiceId");
  if (!clientServiceId) {
    return NextResponse.json({ error: "clientServiceId requis" }, { status: 400 });
  }

  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    select: { organizationId: true },
  });
  if (
    !clientService ||
    !canReadClientService(clientService, await viewerOf(session.user.id))
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.redirect(buildInstagramAuthUrl(clientServiceId));
}
