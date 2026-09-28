import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getSessionCookie } from "better-auth/cookies";
import { routing } from "@/i18n/routing";
import { authPathWithNext } from "@/lib/safe-redirect";

const handleI18nRouting = createIntlMiddleware(routing);

const PROTECTED = /^\/(dashboard|admin)(\/|$)/;

function splitLocale(pathname: string): { prefix: string; path: string } {
  const [, first] = pathname.split("/");
  if (first && (routing.locales as readonly string[]).includes(first) && first !== routing.defaultLocale) {
    return { prefix: `/${first}`, path: pathname.slice(first.length + 1) || "/" };
  }
  return { prefix: "", path: pathname };
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { prefix, path } = splitLocale(pathname);
  if (PROTECTED.test(path) && !getSessionCookie(request)) {
    return NextResponse.redirect(
      new URL(`${prefix}${authPathWithNext("/login", `${pathname}${search}`)}`, request.url)
    );
  }
  return handleI18nRouting(request);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
