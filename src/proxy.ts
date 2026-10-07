import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getSessionCookie } from "better-auth/cookies";
import { routing } from "@/i18n/routing";
import { authPathWithNext } from "@/lib/safe-redirect";
import { isOpenDuringWaitlist, isWaitlistMode } from "@/lib/launch-mode";

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
  if (isWaitlistMode() && !isOpenDuringWaitlist(path)) {
    return NextResponse.redirect(new URL(`${prefix}/`, request.url));
  }
  // Un appel de Server Action n'est pas redirigé : la redirection le ferait
  // aboutir sur /login, où l'action n'existe pas (« Server Action … was not
  // found »). Chaque action vérifie elle-même la session : sans elle, elle
  // renvoie vers /login ou répond « Votre session a expiré ».
  const isServerAction = request.method === "POST" && request.headers.has("next-action");
  if (PROTECTED.test(path) && !isServerAction && !getSessionCookie(request)) {
    return NextResponse.redirect(
      new URL(`${prefix}${authPathWithNext("/login", `${pathname}${search}`)}`, request.url)
    );
  }
  return handleI18nRouting(request);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|apple-icon|.*\\..*).*)",
};
