import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { canManageClientServiceBilling, viewerOf } from "@/lib/client-service-access";
import {
  completeInstagramConnection,
  INSTAGRAM_NONCE_COOKIE,
  INSTAGRAM_OAUTH_COOKIE_PATH,
  verifyInstagramState,
} from "@/lib/instagram";

export async function GET(request: Request) {
  const session = await requireUser();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Le nonce ne sert qu'une fois : il est effacé à chaque sortie.
  const nonce = (await cookies()).get(INSTAGRAM_NONCE_COOKIE)?.value;
  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(new URL(path, url));
    response.cookies.delete({ name: INSTAGRAM_NONCE_COOKIE, path: INSTAGRAM_OAUTH_COOKIE_PATH });
    return response;
  };

  if (error || !code || !state) return redirectTo("/dashboard?instagram=error");

  // Accepté seulement pour la personne qui a lancé la connexion, dans le
  // navigateur qui porte le nonce.
  const clientServiceId = verifyInstagramState(state, { userId: session.user.id, nonce });
  if (!clientServiceId) return redirectTo("/dashboard?instagram=error");

  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    select: { organizationId: true },
  });
  if (
    !clientService ||
    !canManageClientServiceBilling(clientService, await viewerOf(session.user.id))
  ) {
    return redirectTo("/dashboard?instagram=error");
  }

  try {
    await completeInstagramConnection(clientServiceId, code);
  } catch {
    return redirectTo(`/dashboard/services/${clientServiceId}?instagram=error`);
  }

  return redirectTo(`/dashboard/services/${clientServiceId}?instagram=connected`);
}
