import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isOrganizationManager } from "@/lib/organization-roles";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const requested = (await params).locale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Dashboard.profile.export" });
  const session = await getSession();
  if (!session) return new NextResponse(t("unauthenticated"), { status: 401 });
  const userId = session.user.id;

  // Structure de l'export :
  // - account, helpRequests, sessions : données personnelles du compte, complètes ;
  // - organizations : une entrée par organisation dont le compte est membre
  //   AUJOURD'HUI (rôle, date d'arrivée), avec ses solutions — toutes, quel
  //   qu'en soit le créateur. Un membre retiré n'exporte plus rien de
  //   l'organisation qu'il a quittée ;
  // - les données des clients finaux (nom, téléphone et notes des
  //   réservations) ne figurent que pour un propriétaire ou un responsable :
  //   pour un collaborateur, `bookings` ne garde que les dates et le type.
  const [user, memberships, helpRequests, sessions] = await Promise.all([
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
      select: {
        role: true,
        createdAt: true,
        organizationId: true,
        organization: { select: { name: true } },
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

  const organizations = await Promise.all(
    memberships.map(async (membership) => {
      const withCustomerData = isOrganizationManager(membership.role);
      const solutions = await db.clientService.findMany({
        where: { organizationId: membership.organizationId },
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
          userId: true,
          service: { select: { name: true } },
          calendarConnection: { select: { googleAccountEmail: true, createdAt: true } },
          events: { select: { type: true, message: true, createdAt: true } },
          bookings: {
            select: {
              kind: true,
              customerName: withCustomerData,
              customerPhone: withCustomerData,
              startAt: true,
              endAt: true,
              notes: withCustomerData,
              createdAt: true,
            },
          },
          usageEvents: {
            select: { type: true, status: true, occurredAt: true, endedAt: true, durationSec: true },
          },
        },
      });
      return {
        name: membership.organization.name,
        role: membership.role,
        memberSince: membership.createdAt,
        solutions: solutions.map(({ userId: creatorId, ...solution }) => ({
          ...solution,
          createdByMe: creatorId === userId,
        })),
      };
    })
  );

  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      account: user,
      organizations,
      helpRequests,
      sessions,
    },
    null,
    2
  );

  const date = new Date().toISOString().slice(0, 10);
  const fileName: string = t("fileName", { date });
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
