import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { authPathWithNext } from "@/lib/safe-redirect";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    // La page demandee suit le visiteur jusqu'a la connexion : un lien vers une
    // solution ou une facture y ramene au lieu de deposer sur l'accueil.
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(
      new URL(authPathWithNext("/login", `${pathname}${search}`), request.url)
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
