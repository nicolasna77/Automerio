import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canManageClientServiceBilling, viewerOf } from "@/lib/client-service-access";
import { requireUser } from "@/lib/session";
import { oauthNonceCookieOptions } from "@/lib/oauth-state";
import {
  buildInstagramAuthUrl,
  INSTAGRAM_NONCE_COOKIE,
  INSTAGRAM_OAUTH_COOKIE_PATH,
} from "@/lib/instagram";

export async function GET(request: Request) {
  const session = await requireUser();

  const clientServiceId = new URL(request.url).searchParams.get("clientServiceId");
  if (!clientServiceId) {
    return NextResponse.json({ error: "clientServiceId requis" }, { status: 400 });
  }

  // Brancher (ou remplacer) le compte Instagram engage toute l'entreprise :
  // réservé aux responsables, comme la facturation.
  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    select: { organizationId: true },
  });
  if (
    !clientService ||
    !canManageClientServiceBilling(clientService, await viewerOf(session.user.id))
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { url, nonce } = buildInstagramAuthUrl(clientServiceId, session.user.id);
  const response = NextResponse.redirect(url);
  // Nonce à usage unique, exigé puis effacé par le callback.
  response.cookies.set(
    INSTAGRAM_NONCE_COOKIE,
    nonce,
    oauthNonceCookieOptions(INSTAGRAM_OAUTH_COOKIE_PATH)
  );
  return response;
}
