import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié", { status: 401 });
  const userId = session.user.id;

  const [user, memberships, clientServices, helpRequests, sessions] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        notificationPreferences: true,
        twoFactorEnabled: true,
      },
    }),
    db.member.findMany({
      where: { userId },
      select: { role: true, createdAt: true, organization: { select: { name: true } } },
    }),
    db.clientService.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        status: true,
        configuration: true,
        promoCode: true,
        externalPhoneNumber: true,
        whatsappDisplayNumber: true,
        facebookPageName: true,
        instagramUsername: true,
        activatedAt: true,
        canceledAt: true,
        createdAt: true,
        service: { select: { name: true } },
        organization: { select: { name: true } },
        calendarConnection: { select: { googleAccountEmail: true, createdAt: true } },
        events: { select: { type: true, message: true, createdAt: true } },
        bookings: {
          select: {
            kind: true,
            customerName: true,
            customerPhone: true,
            startAt: true,
            endAt: true,
            notes: true,
            createdAt: true,
          },
        },
        usageEvents: {
          select: { type: true, status: true, occurredAt: true, endedAt: true, durationSec: true },
        },
      },
    }),
    db.helpRequest.findMany({
      where: { userId },
      select: {
        subject: true,
        message: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        messages: { select: { fromTeam: true, body: true, createdAt: true } },
      },
    }),
    db.session.findMany({
      where: { userId },
      select: { createdAt: true, expiresAt: true, ipAddress: true, userAgent: true },
    }),
  ]);

  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      account: user,
      organizations: memberships,
      solutions: clientServices,
      helpRequests,
      sessions,
    },
    null,
    2
  );

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mes-donnees-automerio-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
