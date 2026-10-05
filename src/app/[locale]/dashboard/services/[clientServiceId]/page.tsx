import { titleMetadata } from "@/i18n/metadata";
import { notFound } from "next/navigation";
import { AlertTriangle, MessageSquareText, Plug } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { getMyService } from "@/app/[locale]/dashboard/get-my-service";
import {
  asStringArray,
  describeServiceStatus,
  FACEBOOK_SERVICE_SLUG,
  INSTAGRAM_SERVICE_SLUG,
  setupAction,
  TELEPHONY_SERVICE_SLUGS,
  WHATSAPP_SERVICE_SLUG,
} from "@/lib/catalog";
import { StatusBadge } from "@/components/status-badge";
import { ServiceGlyphBadge } from "@/components/service-glyph";
import { BookingsCalendar } from "@/components/bookings-calendar";
import { toCalendarBookings } from "@/lib/bookings";
import { ServiceProgress } from "@/app/[locale]/dashboard/service-progress";
import { ServiceTimeline } from "@/app/[locale]/dashboard/service-timeline";
import {
  hasLiveCalls,
  isLiveTelephony,
  ServiceCallsContent,
  ServiceConfigurationCard,
  ServiceLiveCard,
} from "@/app/[locale]/dashboard/service-detail-table";
import { ServiceActivityTabs } from "@/app/[locale]/dashboard/service-activity-tabs";
import { TestCallCard } from "@/app/[locale]/dashboard/test-call-card";
import { isDemoCallAvailable } from "@/lib/demo-call";
import { ConversationHistory } from "@/app/[locale]/dashboard/conversation-history";
import { ServiceDetailActions } from "@/app/[locale]/dashboard/service-detail-actions";
import { isSetupComplete, ServiceSetupCard } from "@/app/[locale]/dashboard/service-setup-card";
import { ServiceSubscriptionCard } from "@/app/[locale]/dashboard/service-subscription-card";
import { BILLING_SECTION_ID, CONNECTORS_SECTION_ID } from "@/app/[locale]/dashboard/billing-section";
import { getSubscriptionFor } from "@/lib/subscriptions";
import { formatPriceWithVat } from "@/lib/vat";
import { PageBreadcrumbs, PageShell } from "@/components/page-shell";

const MESSAGING_SERVICE_SLUGS = new Set([
  WHATSAPP_SERVICE_SLUG,
  FACEBOOK_SERVICE_SLUG,
  INSTAGRAM_SERVICE_SLUG,
]);

export const generateMetadata = titleMetadata("serviceDetail");

// Disposition : ce qui demande une action ou montre l'activité occupe la
// colonne principale (mise en service, appels, rendez-vous, conversations) ;
// l'abonnement, l'essai, les réglages et l'historique vont dans la colonne
// latérale. Sans activité à montrer, les cartes latérales passent sur deux
// colonnes plutôt que de laisser un grand vide.
export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientServiceId: string }>;
  searchParams: Promise<{ calendar?: string }>;
}) {
  const [{ clientServiceId }, { calendar }, session] = await Promise.all([
    params,
    searchParams,
    requireUser(),
    requireActiveOrganization(),
  ]);
  // L'abonnement est lu en parallèle, mais rien n'est affiché avant que
  // getMyService ait vérifié que la solution appartient bien au client.
  const [item, subscription] = await Promise.all([
    getMyService(clientServiceId, session.user.id),
    getSubscriptionFor(clientServiceId),
  ]);
  if (!item) notFound();

  const isLive = isLiveTelephony(item);
  const objectives = asStringArray(item.configuration.objectives);
  const showBookings =
    isLive && (objectives.includes("appointment") || objectives.includes("order"));
  const isMessaging = MESSAGING_SERVICE_SLUGS.has(item.service.slug);
  // Téléphonie : les informations du service passent en haut de la page et
  // l'historique n'est pas affiché ; l'activité (appels, rendez-vous) prime.
  const isTelephony = TELEPHONY_SERVICE_SLUGS.has(item.service.slug);
  const showSetup = !isSetupComplete(item);
  // Agenda facultatif : une fois la solution en service sans agenda, une
  // alerte propose de le connecter depuis l'onglet Connecteurs.
  const suggestsCalendar =
    isTelephony && isLive && !showSetup && objectives.includes("appointment") && !item.calendarConnected;
  const hasMainColumn =
    (showSetup && !isTelephony) || (isLive && Boolean(item.externalPhoneNumber)) || showBookings || isMessaging;
  // Avec la mise en service intégrée à l'en-tête (téléphonie), sa liste
  // d'étapes suffit : pas de seconde barre de progression.
  const showProgress =
    item.status !== "ACTIVE" && item.status !== "CANCELED" && !(isTelephony && showSetup);

  const { scheduled: scheduledBookings, unscheduled: unscheduledBookings } =
    toCalendarBookings(item.bookings, {
      subtitle: (b) => b.customerPhone,
      isSynced: (b) =>
        !item.calendarConnected || Boolean(b.googleEventId || b.externalBookingId),
    });

  const sideCards = (
    <>
      {subscription && (
        <ServiceSubscriptionCard
          subscription={subscription}
          settingsHref={`/dashboard/services/${item.clientServiceId}/configuration#${BILLING_SECTION_ID}`}
        />
      )}
      {isLive && isDemoCallAvailable() && <TestCallCard clientServiceId={item.clientServiceId} />}
      {!isTelephony && (
        <>
          <ServiceConfigurationCard item={item} showUsageCap={!subscription?.cap} />
          <ServiceTimeline events={item.events} />
        </>
      )}
    </>
  );

  return (
    <PageShell size="wide">
      <PageBreadcrumbs
        items={[
          { label: "Solutions", href: "/dashboard/services" },
          { label: item.name },
        ]}
      />

      {isTelephony ? (
        // Téléphonie : présentation de la solution et informations du service
        // réunies dans une seule carte.
        <Card>
          <CardContent className="space-y-6">
          <header className="flex items-start gap-4">
            <ServiceGlyphBadge slug={item.service.slug} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 basis-56 flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {item.name}
                  </h1>
                  <StatusBadge status={item.status} setupPending={setupAction(item) !== null} />
                </div>
                <div className="shrink-0">
                  <ServiceDetailActions item={item} />
                </div>
              </div>

              {item.name !== item.service.name && (
                <p className="text-sm text-muted-foreground">{item.service.name}</p>
              )}
              <p className="mt-2 max-w-2xl text-muted-foreground">{item.service.description}</p>

              <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <span className="font-medium text-foreground">{describeServiceStatus(item)}</span>
                {!subscription && (
                  <span className="tabular-nums text-muted-foreground">
                    {formatPriceWithVat(item.service.monthlyPriceCents)}
                  </span>
                )}
              </p>
              {showProgress && (
                <div className="max-w-2xl">
                  <ServiceProgress status={item.status} />
                </div>
              )}
            </div>
          </header>
            {showSetup && (
              <div className="border-t border-border pt-6">
                <ServiceSetupCard item={item} embedded />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <header className="flex items-start gap-4">
          <ServiceGlyphBadge slug={item.service.slug} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 basis-56 flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {item.name}
                </h1>
                <StatusBadge status={item.status} setupPending={setupAction(item) !== null} />
              </div>
              <div className="shrink-0">
                <ServiceDetailActions item={item} />
              </div>
            </div>

            {item.name !== item.service.name && (
              <p className="text-sm text-muted-foreground">{item.service.name}</p>
            )}
            <p className="mt-2 max-w-2xl text-muted-foreground">{item.service.description}</p>

            <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <span className="font-medium text-foreground">{describeServiceStatus(item)}</span>
              {!subscription && (
                <span className="tabular-nums text-muted-foreground">
                  {formatPriceWithVat(item.service.monthlyPriceCents)}
                </span>
              )}
            </p>
            {showProgress && (
              <div className="max-w-2xl">
                <ServiceProgress status={item.status} />
              </div>
            )}
          </div>
        </header>
      )}

      {suggestsCalendar && (
        <Alert className="mt-6">
          <Plug aria-hidden="true" />
          <AlertTitle>Connectez un agenda pour que l&apos;assistant réserve</AlertTitle>
          <AlertDescription>
            <p>
              Facultatif. Sans agenda, l&apos;assistant prend les demandes de rendez-vous en message.
              Avec Google Agenda, Cal.com ou Calendly, il réserve directement.
            </p>
            <Link
              href={`/dashboard/services/${item.clientServiceId}/configuration#${CONNECTORS_SECTION_ID}`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3" })}
            >
              Connecter un agenda
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {(calendar === "error" || item.adminNote) && (
        <div className="mt-6 space-y-3">
          {calendar === "error" && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Connexion à l&apos;agenda impossible</AlertTitle>
              <AlertDescription>
                Réessayez depuis la carte Mise en service, ou contactez-nous si
                le problème persiste.
              </AlertDescription>
            </Alert>
          )}
          {item.adminNote && (
            <Alert role="note" className="border-primary/25 bg-primary/5">
              <MessageSquareText aria-hidden="true" className="text-primary" />
              <AlertTitle>Note de l&apos;équipe Automerio</AlertTitle>
              <AlertDescription className="text-foreground">{item.adminNote}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {hasMainColumn ? (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            {showSetup && !isTelephony && <ServiceSetupCard item={item} />}
            {/* Appels et calendrier ensemble : deux onglets d'une même carte. */}
            {showBookings && hasLiveCalls(item) ? (
              <ServiceActivityTabs
                calls={<ServiceCallsContent item={item} />}
                calendar={<BookingsCalendar scheduled={scheduledBookings} unscheduled={unscheduledBookings} />}
              />
            ) : (
              <ServiceLiveCard item={item} />
            )}
            {showBookings && !hasLiveCalls(item) && (
              <Card>
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
            {isMessaging && <ConversationHistory clientServiceId={item.clientServiceId} />}
          </div>
          <aside aria-label="Abonnement et réglages" className="min-w-0 space-y-6">
            {sideCards}
          </aside>
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2 *:min-w-0">{sideCards}</div>
      )}
    </PageShell>
  );
}
