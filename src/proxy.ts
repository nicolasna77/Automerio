import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { authPathWithNext } from "@/lib/safe-redirect";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
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
