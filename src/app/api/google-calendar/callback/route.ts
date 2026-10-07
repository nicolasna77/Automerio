import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { canManageClientServiceBilling, viewerOf } from "@/lib/client-service-access";
import { CONNECTORS_SECTION_ID } from "@/app/[locale]/dashboard/billing-section";
import {
  completeGoogleCalendarConnection,
  GOOGLE_NONCE_COOKIE,
  GOOGLE_OAUTH_COOKIE_PATH,
  GOOGLE_RETURN_COOKIE,
  verifyState,
} from "@/lib/google-calendar";

export async function GET(request: Request) {
  const session = await requireUser();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Les cookies de retour et de nonce sont lus puis effacés à chaque sortie,
  // y compris quand la personne annule chez Google : le nonce ne sert qu'une
  // fois, et une connexion suivante, lancée depuis la page de la solution, ne
  // doit pas revenir par erreur sur les réglages.
  const jar = await cookies();
  const fromSettings = jar.get(GOOGLE_RETURN_COOKIE)?.value === "settings";
  const nonce = jar.get(GOOGLE_NONCE_COOKIE)?.value;
  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(new URL(path, url));
    response.cookies.delete({ name: GOOGLE_RETURN_COOKIE, path: GOOGLE_OAUTH_COOKIE_PATH });
    response.cookies.delete({ name: GOOGLE_NONCE_COOKIE, path: GOOGLE_OAUTH_COOKIE_PATH });
    return response;
  };

  // Même en cas d'annulation chez Google, le state signé désigne encore la
  // solution : on revient là où la connexion a commencé. Il n'est accepté que
  // pour la personne qui l'a demandé, dans le navigateur qui porte le nonce.
  const clientServiceId = state
    ? verifyState(state, { userId: session.user.id, nonce })
    : null;
  if (!clientServiceId) return redirectTo("/dashboard?calendar=error");

  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    select: { organizationId: true },
  });
  if (
    !clientService ||
    !canManageClientServiceBilling(clientService, await viewerOf(session.user.id))
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
