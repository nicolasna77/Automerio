import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canReadClientService, viewerOf } from "@/lib/client-service-access";
import { requireUser } from "@/lib/session";
import { buildGoogleAuthUrl, GOOGLE_RETURN_COOKIE } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const session = await requireUser();

  const params = new URL(request.url).searchParams;
  const clientServiceId = params.get("clientServiceId");
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

  const response = NextResponse.redirect(buildGoogleAuthUrl(clientServiceId));
  // Lancée depuis les réglages : on y revient après Google (une seule valeur
  // admise, rien d'autre ne peut servir d'adresse de retour).
  if (params.get("from") === "settings") {
    response.cookies.set(GOOGLE_RETURN_COOKIE, "settings", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/google-calendar",
      maxAge: 15 * 60,
    });
  }
  return response;
}
