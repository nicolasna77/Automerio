import { titleMetadata } from "@/i18n/metadata";
import { getLabels } from "@/lib/labels-server";
import { getTranslations } from "next-intl/server";
import { formatFrenchPhone } from "@/lib/phone-format";
import { notFound } from "next/navigation";
import { AlertTriangle, MessageSquareText, Plug } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { canManageClientServiceBilling, viewerOf } from "@/lib/client-service-access";
import { getMyService } from "@/app/[locale]/dashboard/get-my-service";
import { asStringArray, canPauseService, MESSAGING_SERVICE_SLUGS, TELEPHONY_SERVICE_SLUGS } from "@/lib/catalog";
import { StatusBadge } from "@/components/status-badge";
import { PauseSwitch } from "@/app/[locale]/dashboard/pause-switch";
import { QuotaMeter } from "@/app/[locale]/dashboard/quota-meter";
import { MonthlyPrice } from "@/components/monthly-price";
import { ServiceGlyphBadge } from "@/components/service-glyph";
import { BookingsCalendar } from "@/components/bookings-calendar";
import { toCalendarBookings } from "@/lib/bookings";
import { ServiceProgress } from "@/app/[locale]/dashboard/service-progress";
import {
  hasLiveCalls,
  isLiveTelephony,
  ServiceCallsContent,
  ServiceLiveCard,
} from "@/app/[locale]/dashboard/service-detail-table";
import { ServiceActivityTabs } from "@/app/[locale]/dashboard/service-activity-tabs";
import { TestCallCard } from "@/app/[locale]/dashboard/test-call-card";
import { isDemoCallAvailable } from "@/lib/demo-call";
import { ConversationHistory } from "@/app/[locale]/dashboard/conversation-history";
import { ServiceDetailActions } from "@/app/[locale]/dashboard/service-detail-actions";
import { isSetupComplete, ServiceSetupCard } from "@/app/[locale]/dashboard/service-setup-card";
import { BILLING_SECTION_ID, CONNECTORS_SECTION_ID } from "@/app/[locale]/dashboard/billing-section";
import { getSubscriptionFor, isRunning } from "@/lib/subscriptions";
import { formatPriceWithVat } from "@/lib/vat";
import { PageBreadcrumbs, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("serviceDetail");

// Disposition : ce qui demande une action ou montre l'activité occupe la
// colonne principale (mise en service, appels, rendez-vous, conversations) ;
// l'appel d'essai va dans la colonne latérale, quand il est proposé ; le
// tarif et le quota sont dans le sous-titre ; les réglages ont leur propre
// page (bouton Réglages de l'en-tête).
export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientServiceId: string }>;
  searchParams: Promise<{ calendar?: string; instagram?: string }>;
}) {
  const [{ clientServiceId }, { calendar, instagram }, session, { active: organization }, t, labels, tPause] = await Promise.all([
    params,
    searchParams,
    requireUser(),
    requireActiveOrganization(),
    getTranslations("Dashboard.service"),
    getLabels(),
    getTranslations("Dashboard.services.list.pause"),
  ]);
  // L'abonnement est lu en parallèle, mais rien n'est affiché avant que
  // getMyService ait vérifié que la solution appartient bien au client.
  const [item, subscription] = await Promise.all([
    getMyService(clientServiceId, session.user.id),
    getSubscriptionFor(clientServiceId),
  ]);
  if (!item) notFound();
  // Connexions et achat de numéro : réservés aux responsables (vérifié aussi
  // côté serveur) ; les autres membres voient une explication à la place.
  const canManage = canManageClientServiceBilling(
    { organizationId: organization.id },
    await viewerOf(session.user.id)
  );

  const quota = subscription?.cap && subscription.usage
    ? { cap: subscription.cap, consumedUnits: subscription.usage.consumedUnits }
    : null;
  const monthlyCents = subscription?.monthlyPriceCents ?? item.service.monthlyPriceCents;
  const isLive = isLiveTelephony(item);
  const objectives = asStringArray(item.configuration.objectives);
  const showBookings =
    isLive && (objectives.includes("appointment") || objectives.includes("order"));
  const isMessaging = MESSAGING_SERVICE_SLUGS.has(item.service.slug);
  const isTelephony = TELEPHONY_SERVICE_SLUGS.has(item.service.slug);
  const showSetup = !isSetupComplete(item);
  // Agenda facultatif : une fois la solution en service sans agenda, une
  // alerte propose de le connecter depuis l'onglet Connecteurs.
  const suggestsCalendar =
    isTelephony && isLive && !showSetup && objectives.includes("appointment") && !item.calendarConnected;
  const hasMainColumn =
    showSetup || (isLive && Boolean(item.externalPhoneNumber)) || showBookings || isMessaging;
  const showProgress = item.status !== "ACTIVE" && item.status !== "CANCELED";
  // Retour de Meta en échec (?instagram=error|in-use), tant que le compte
  // n'est pas connecté.
  const instagramFailure =
    !item.instagramConnected && (instagram === "error" || instagram === "in-use") ? instagram : null;

  const { scheduled: scheduledBookings, unscheduled: unscheduledBookings } =
    toCalendarBookings(item.bookings, {
      subtitle: (b) => formatFrenchPhone(b.customerPhone),
      isSynced: (b) =>
        !item.calendarConnected || Boolean(b.googleEventId || b.externalBookingId),
    });

  // Le tarif et le quota sont dans le sous-titre : seule la carte d'essai
  // reste à côté de l'activité.
  const testCall = isLive && isDemoCallAvailable() ? (
    <TestCallCard clientServiceId={item.clientServiceId} />
  ) : null;

  return (
    <PageShell size="wide">
      <PageBreadcrumbs
        items={[
          { label: t("breadcrumb"), href: "/dashboard/services" },
          { label: item.name },
        ]}
      />

      <header className="@container flex items-start gap-4">
        <ServiceGlyphBadge slug={item.service.slug} size="lg" />
        {/* Grille : quand l'en-tête a la place (requête de conteneur, pas
            d'écran : la barre latérale réduit la largeur), les actions à
            droite du titre ; sinon, sous le résumé, sans écraser le titre. */}
        <div className="grid min-w-0 flex-1 gap-x-3 @4xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="order-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 @4xl:col-start-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {item.name}
            </h1>
            <StatusBadge status={item.status} pausedAt={item.pausedAt} />
          </div>
          {/* L'interrupteur de pause rejoint les actions : il agit sur la
              solution, comme les réglages et la résiliation. */}
          <div className="order-4 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 @4xl:order-none @4xl:col-start-2 @4xl:row-start-1 @4xl:mt-0 @4xl:justify-end">
            {canManage && canPauseService(item) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PauseSwitch
                  clientServiceId={item.clientServiceId}
                  name={item.name}
                  paused={item.pausedAt !== null}
                />
                <span aria-hidden="true">{tPause("label")}</span>
              </div>
            )}
            <ServiceDetailActions item={item} />
          </div>

          <p className="order-2 mt-1 max-w-2xl text-sm text-muted-foreground @4xl:col-start-1">
            {item.name !== item.service.name && (
              <span className="font-medium text-foreground">{item.service.name}. </span>
            )}
            {item.service.description}
          </p>

          {/* Sous-titre : où en est la solution, ce qu'elle coûte et, quand
              elle a un forfait, ce qui en est consommé ce mois-ci. Trois
              repères libellés, qui passent à la ligne sans séparateur
              orphelin. */}
          <dl
            aria-label={t("summary.label")}
            className="order-3 mt-4 flex flex-wrap gap-x-10 gap-y-3 text-sm @4xl:col-span-2 @4xl:col-start-1"
          >
            <div>
              <dt className="text-xs text-muted-foreground">{t("summary.status")}</dt>
              <dd className="mt-0.5 font-medium text-foreground">{labels.serviceStatus(item)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("summary.price")}</dt>
              {/* TTC seul : le détail HT est dans la carte Abonnement. */}
              <dd className="mt-0.5 text-foreground">
                {monthlyCents === null ? (
                  formatPriceWithVat(null)
                ) : (
                  <MonthlyPrice cents={monthlyCents} showExcludingVat={false} />
                )}
              </dd>
              {subscription && isRunning(subscription) && (
                <dd className="mt-0.5">
                  <Link
                    href={`/dashboard/services/${item.clientServiceId}/configuration#${BILLING_SECTION_ID}`}
                    className="text-sm text-primary underline-offset-4 hover:underline focus-visible:focus-ring"
                  >
                    {t("subscription.adjust")}
                  </Link>
                </dd>
              )}
            </div>
            {quota && (
              <div>
                <dt className="text-xs text-muted-foreground">{t("summary.quota")}</dt>
                <dd className="mt-1">
                  <QuotaMeter cap={quota.cap} consumedUnits={quota.consumedUnits} variant="inline" />
                </dd>
              </div>
            )}
          </dl>
          {showProgress && (
            <div className="order-5 max-w-2xl @4xl:col-start-1">
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

      {(calendar === "error" || instagramFailure || item.adminNote) && (
        <div className="mt-6 space-y-3">
          {calendar === "error" && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>{t("calendarError.title")}</AlertTitle>
              <AlertDescription>{t("calendarError.description")}</AlertDescription>
            </Alert>
          )}
          {instagramFailure && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>
                {instagramFailure === "in-use" ? t("instagramError.inUseTitle") : t("instagramError.title")}
              </AlertTitle>
              <AlertDescription>
                {instagramFailure === "in-use"
                  ? t("instagramError.inUseDescription")
                  : t("instagramError.description")}
              </AlertDescription>
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
        <div className={cn("mt-8 grid items-start gap-6", testCall && "lg:grid-cols-3")}>
          <div className={cn("min-w-0 space-y-6", testCall && "lg:col-span-2")}>
            {showSetup && <ServiceSetupCard item={item} canManage={canManage} />}
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
          {testCall && (
            <aside aria-label={t("aside")} className="min-w-0 space-y-6">
              {testCall}
            </aside>
          )}
        </div>
      ) : (
        testCall && <div className="mt-8 max-w-xl">{testCall}</div>
      )}
    </PageShell>
  );
}
