import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { canReadClientService, viewerOf } from "@/lib/client-service-access";
import { CONNECTORS_SECTION_ID } from "@/app/[locale]/dashboard/billing-section";
import { completeGoogleCalendarConnection, GOOGLE_RETURN_COOKIE, verifyState } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const session = await requireUser();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Le cookie de retour est lu puis effacé à chaque sortie, y compris quand
  // la personne annule chez Google : sinon une connexion suivante, lancée
  // depuis la page de la solution, reviendrait par erreur sur les réglages.
  const fromSettings = (await cookies()).get(GOOGLE_RETURN_COOKIE)?.value === "settings";
  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(new URL(path, url));
    response.cookies.delete({ name: GOOGLE_RETURN_COOKIE, path: "/api/google-calendar" });
    return response;
  };

  // Même en cas d'annulation chez Google, le state signé désigne encore la
  // solution : on revient là où la connexion a commencé.
  const clientServiceId = state ? verifyState(state) : null;
  if (!clientServiceId) return redirectTo("/dashboard?calendar=error");

  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    select: { organizationId: true },
  });
  if (
    !clientService ||
    !canReadClientService(clientService, await viewerOf(session.user.id))
  ) {
    return redirectTo("/dashboard?calendar=error");
  }

  const back = (status: "connected" | "error") =>
    redirectTo(
      fromSettings
        ? `/dashboard/services/${clientServiceId}/configuration?calendar=${status}#${CONNECTORS_SECTION_ID}`
        : `/dashboard/services/${clientServiceId}?calendar=${status}`
    );

  if (error || !code) return back("error");

  try {
    await completeGoogleCalendarConnection(clientServiceId, code);
  } catch {
    return back("error");
  }

  return back("connected");
}
