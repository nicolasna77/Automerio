import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { canReadClientService, viewerOf } from "@/lib/client-service-access";
import { completeInstagramConnection, verifyInstagramState } from "@/lib/instagram";

export async function GET(request: Request) {
  const session = await requireUser();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(new URL("/dashboard?instagram=error", url));
  }

  const clientServiceId = verifyInstagramState(state);
  if (!clientServiceId) {
    return NextResponse.redirect(new URL("/dashboard?instagram=error", url));
  }

  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    select: { organizationId: true },
  });
  if (
    !clientService ||
    !canReadClientService(clientService, await viewerOf(session.user.id))
  ) {
    return NextResponse.redirect(new URL("/dashboard?instagram=error", url));
  }

  try {
    await completeInstagramConnection(clientServiceId, code);
  } catch {
    return NextResponse.redirect(
      new URL(`/dashboard/services/${clientServiceId}?instagram=error`, url)
    );
  }

  return NextResponse.redirect(
    new URL(`/dashboard/services/${clientServiceId}?instagram=connected`, url)
  );
}
