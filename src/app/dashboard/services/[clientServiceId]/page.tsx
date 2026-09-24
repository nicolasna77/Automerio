import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { getMyService } from "@/app/dashboard/get-my-service";
import {
  asStringArray,
  describeServiceStatus,
  TELEPHONY_SERVICE_SLUGS,
} from "@/lib/catalog";
import { StatusBadge } from "@/components/status-badge";
import { ServiceGlyphBadge } from "@/components/service-glyph";
import { BookingsCalendar } from "@/components/bookings-calendar";
import { toCalendarBookings } from "@/lib/bookings";
import { ServiceProgress } from "@/app/dashboard/service-progress";
import { ServiceTimeline } from "@/app/dashboard/service-timeline";
import { ServiceDetailTable } from "@/app/dashboard/service-detail-table";
import { ConversationHistory } from "@/app/dashboard/conversation-history";
import {
  FACEBOOK_SERVICE_SLUG,
  INSTAGRAM_SERVICE_SLUG,
  WHATSAPP_SERVICE_SLUG,
} from "@/lib/catalog";

const MESSAGING_SERVICE_SLUGS = new Set([
  WHATSAPP_SERVICE_SLUG,
  FACEBOOK_SERVICE_SLUG,
  INSTAGRAM_SERVICE_SLUG,
]);
import { ServiceDetailActions } from "@/app/dashboard/service-detail-actions";
import { ServiceSetupCard } from "@/app/dashboard/service-setup-card";
import { ServiceSubscriptionCard } from "@/app/dashboard/service-subscription-card";
import { getSubscriptionFor } from "@/lib/subscriptions";
import { formatPriceWithVat } from "@/lib/vat";
import { PageBreadcrumbs, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Détail de la solution" };

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientServiceId: string }>;
  searchParams: Promise<{ calendar?: string }>;
}) {
  const [{ clientServiceId }, { calendar }] = await Promise.all([
    params,
    searchParams,
  ]);
  const [session, { active: organization }] = await Promise.all([
    requireUser(),
    requireActiveOrganization(),
  ]);
  const item = await getMyService(clientServiceId, session.user.id);
  if (!item) notFound();

  // Null pour une solution sans abonnement mensuel : elle n'a pas de periode.
  const subscription = await getSubscriptionFor(clientServiceId);
  // La carte d'abonnement dit deja le plafond : le tableau ne le repete pas.
  const subscriptionShowsCap = Boolean(subscription?.cap);

  const isLive =
    TELEPHONY_SERVICE_SLUGS.has(item.service.slug) &&
    (item.status === "ACTIVE" || item.status === "CONFIGURING");
  const objectives = asStringArray(item.configuration.objectives);
  const showBookings =
    isLive && (objectives.includes("appointment") || objectives.includes("order"));

  const { scheduled: scheduledBookings, unscheduled: unscheduledBookings } =
    toCalendarBookings(item.bookings, {
      subtitle: (b) => b.customerPhone,
      isSynced: (b) => !item.calendarConnected || Boolean(b.googleEventId),
    });

  return (
    <PageShell size="wide">
      <PageBreadcrumbs
        items={[
          { label: "Solutions", href: "/dashboard/prestations" },
          { label: item.name },
        ]}
      />

      {calendar === "error" && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Connexion à l&apos;agenda impossible</AlertTitle>
          <AlertDescription>
            Réessayez depuis la section Agenda ci-dessous, ou contactez-nous si
            le problème persiste.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <ServiceGlyphBadge slug={item.service.slug} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                {item.name}
              </h1>
              <StatusBadge status={item.status} />
              <span className="text-base tabular-nums text-foreground">
                {formatPriceWithVat(item.service.setupFeeCents, item.service.monthlyPriceCents)}
              </span>
            </div>

            {item.name !== item.service.name && (
              <p className="text-sm text-muted-foreground">{item.service.name}</p>
            )}
            <p className="mt-2 max-w-xl text-muted-foreground">
              {item.service.description}
            </p>

            <p className="mt-4 text-sm font-medium text-foreground">
              {describeServiceStatus(item)}
            </p>
            <ServiceProgress status={item.status} />
          </div>
        </div>

        <div className="shrink-0 sm:pt-1">
          <ServiceDetailActions item={item} />
        </div>
      </div>

      <div className={showBookings ? "mt-8 grid gap-6 lg:grid-cols-5" : "mt-8"}>
        <div className={showBookings ? "space-y-6 lg:col-span-2" : "space-y-6"}>
          <ServiceSetupCard item={item} />
          {subscription && (
            <ServiceSubscriptionCard
              subscription={subscription}
              organizationId={organization.id}
            />
          )}
          <ServiceDetailTable item={item} showUsageCap={!subscriptionShowsCap} />
          {MESSAGING_SERVICE_SLUGS.has(item.service.slug) && (
            <ConversationHistory clientServiceId={item.clientServiceId} />
          )}
          <ServiceTimeline events={item.events} />
        </div>

        {showBookings && (
          <Card className="h-fit lg:col-span-3">
            <CardHeader>
              <CardTitle as="h2" className="text-base">
                Rendez-vous et commandes reçus
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[30rem] sm:h-[34rem]">
              <BookingsCalendar
                scheduled={scheduledBookings}
                unscheduled={unscheduledBookings}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
