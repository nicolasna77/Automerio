import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { canReadClientService, viewerOf } from "@/lib/client-service-access";
import { cookies } from "next/headers";
import { CONNECTORS_SECTION_ID } from "@/app/[locale]/dashboard/billing-section";
import { completeGoogleCalendarConnection, GOOGLE_RETURN_COOKIE, verifyState } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const session = await requireUser();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(new URL("/dashboard?calendar=error", url));
  }

  const clientServiceId = verifyState(state);
  if (!clientServiceId) {
    return NextResponse.redirect(new URL("/dashboard?calendar=error", url));
  }

  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    select: { organizationId: true },
  });
  if (
    !clientService ||
    !canReadClientService(clientService, await viewerOf(session.user.id))
  ) {
    return NextResponse.redirect(new URL("/dashboard?calendar=error", url));
  }

  const cookieStore = await cookies();
  const fromSettings = cookieStore.get(GOOGLE_RETURN_COOKIE)?.value === "settings";
  const back = (status: "connected" | "error") => {
    const target = fromSettings
      ? `/dashboard/services/${clientServiceId}/configuration?calendar=${status}#${CONNECTORS_SECTION_ID}`
      : `/dashboard/services/${clientServiceId}?calendar=${status}`;
    const response = NextResponse.redirect(new URL(target, url));
    response.cookies.delete({ name: GOOGLE_RETURN_COOKIE, path: "/api/google-calendar" });
    return response;
  };

  try {
    await completeGoogleCalendarConnection(clientServiceId, code);
  } catch {
    return back("error");
  }

  return back("connected");
}
