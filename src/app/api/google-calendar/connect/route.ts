import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canManageClientServiceBilling, viewerOf } from "@/lib/client-service-access";
import { requireUser } from "@/lib/session";
import { oauthNonceCookieOptions } from "@/lib/oauth-state";
import {
  buildGoogleAuthUrl,
  GOOGLE_NONCE_COOKIE,
  GOOGLE_OAUTH_COOKIE_PATH,
  GOOGLE_RETURN_COOKIE,
} from "@/lib/google-calendar";

export async function GET(request: Request) {
  const session = await requireUser();

  const params = new URL(request.url).searchParams;
  const clientServiceId = params.get("clientServiceId");
  if (!clientServiceId) {
    return NextResponse.json({ error: "clientServiceId requis" }, { status: 400 });
  }

  // Brancher (ou remplacer) l'agenda engage toute l'entreprise : réservé aux
  // responsables, comme la facturation.
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

  const { url, nonce } = buildGoogleAuthUrl(clientServiceId, session.user.id);
  const response = NextResponse.redirect(url);
  const cookieOptions = oauthNonceCookieOptions(GOOGLE_OAUTH_COOKIE_PATH);
  // Nonce à usage unique, exigé puis effacé par le callback.
  response.cookies.set(GOOGLE_NONCE_COOKIE, nonce, cookieOptions);
  // Lancée depuis les réglages : on y revient après Google (une seule valeur
  // admise, rien d'autre ne peut servir d'adresse de retour).
  if (params.get("from") === "settings") {
    response.cookies.set(GOOGLE_RETURN_COOKIE, "settings", cookieOptions);
  } else {
    // Une connexion lancée ailleurs ne doit pas hériter d'un ancien retour.
    response.cookies.delete({ name: GOOGLE_RETURN_COOKIE, path: GOOGLE_OAUTH_COOKIE_PATH });
  }
  return response;
}
