import { titleMetadata } from "@/i18n/metadata";
import { getLabels } from "@/lib/labels-server";
import { getTranslations } from "next-intl/server";
import { formatFrenchPhone } from "@/lib/phone-format";
import { notFound } from "next/navigation";
import { AlertTriangle, MessageSquareText, Plug } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { getMyService } from "@/app/[locale]/dashboard/get-my-service";
import { asStringArray, FACEBOOK_SERVICE_SLUG, INSTAGRAM_SERVICE_SLUG, TELEPHONY_SERVICE_SLUGS, WHATSAPP_SERVICE_SLUG } from "@/lib/catalog";
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
  const [{ clientServiceId }, { calendar }, session, , t, labels] = await Promise.all([
    params,
    searchParams,
    requireUser(),
    requireActiveOrganization(),
    getTranslations("Dashboard.service"),
    getLabels(),
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
  // Téléphonie : l'historique n'est pas affiché ; l'activité (appels,
  // rendez-vous) prime.
  const isTelephony = TELEPHONY_SERVICE_SLUGS.has(item.service.slug);
  const showSetup = !isSetupComplete(item);
  // Agenda facultatif : une fois la solution en service sans agenda, une
  // alerte propose de le connecter depuis l'onglet Connecteurs.
  const suggestsCalendar =
    isTelephony && isLive && !showSetup && objectives.includes("appointment") && !item.calendarConnected;
  const hasMainColumn =
    showSetup || (isLive && Boolean(item.externalPhoneNumber)) || showBookings || isMessaging;
  const showProgress = item.status !== "ACTIVE" && item.status !== "CANCELED";

  const { scheduled: scheduledBookings, unscheduled: unscheduledBookings } =
    toCalendarBookings(item.bookings, {
      subtitle: (b) => formatFrenchPhone(b.customerPhone),
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
          { label: t("breadcrumb"), href: "/dashboard/services" },
          { label: item.name },
        ]}
      />

      <header className="flex items-start gap-4">
        <ServiceGlyphBadge slug={item.service.slug} size="lg" />
        {/* Grille : sur ordinateur, les actions à droite du titre ; sur
            mobile, après la description plutôt qu'entre le titre et elle. */}
        <div className="grid min-w-0 flex-1 gap-x-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="order-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:col-start-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {item.name}
            </h1>
            <StatusBadge status={item.status} />
          </div>
          <div className="order-4 mt-3 sm:order-none sm:col-start-2 sm:row-start-1 sm:mt-0">
            <ServiceDetailActions item={item} />
          </div>

          {item.name !== item.service.name && (
            <p className="order-2 text-sm text-muted-foreground sm:col-start-1">{item.service.name}</p>
          )}
          <p className="order-3 mt-2 max-w-2xl text-muted-foreground sm:col-start-1">{item.service.description}</p>

          <p className="order-5 mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm sm:col-start-1">
            <span className="font-medium text-foreground">{labels.serviceStatus(item)}</span>
            {!subscription && (
              <span className="tabular-nums text-muted-foreground">
                {formatPriceWithVat(item.service.monthlyPriceCents)}
              </span>
            )}
          </p>
          {showProgress && (
            <div className="order-6 max-w-2xl sm:col-start-1">
              <ServiceProgress status={item.status} />
            </div>
          )}
        </div>
      </header>

      {suggestsCalendar && (
        <Alert className="mt-6">
          <Plug aria-hidden="true" />
          <AlertTitle>{t("calendarSuggestion.title")}</AlertTitle>
          <AlertDescription>
            <p>{t("calendarSuggestion.description")}</p>
            <Link
              href={`/dashboard/services/${item.clientServiceId}/configuration#${CONNECTORS_SECTION_ID}`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3" })}
            >
              {t("calendarSuggestion.cta")}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {(calendar === "error" || item.adminNote) && (
        <div className="mt-6 space-y-3">
          {calendar === "error" && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>{t("calendarError.title")}</AlertTitle>
              <AlertDescription>{t("calendarError.description")}</AlertDescription>
            </Alert>
          )}
          {item.adminNote && (
            <Alert role="note" className="border-primary/25 bg-primary/5">
              <MessageSquareText aria-hidden="true" className="text-primary" />
              <AlertTitle>{t("teamNote")}</AlertTitle>
              <AlertDescription className="text-foreground">{item.adminNote}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {hasMainColumn ? (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            {showSetup && <ServiceSetupCard item={item} />}
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
                    {t("bookings")}
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
          <aside aria-label={t("aside")} className="min-w-0 space-y-6">
            {sideCards}
          </aside>
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2 *:min-w-0">{sideCards}</div>
      )}
    </PageShell>
  );
}
