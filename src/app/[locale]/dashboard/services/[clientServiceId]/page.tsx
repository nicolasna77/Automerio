import { titleMetadata } from "@/i18n/metadata";
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
import {
  canManageClientServiceBilling,
  viewerOf,
} from "@/lib/client-service-access";
import { getMyService } from "@/app/[locale]/dashboard/get-my-service";
import {
  asStringArray,
  canPauseService,
  MESSAGING_SERVICE_SLUGS,
  TELEPHONY_SERVICE_SLUGS,
} from "@/lib/catalog";
import { StatusBadge } from "@/components/status-badge";
import { PauseSwitch } from "@/app/[locale]/dashboard/pause-switch";
import { QuotaMeter } from "@/app/[locale]/dashboard/quota-meter";
import { UsageNote } from "@/app/[locale]/dashboard/subscriptions/usage-gauge";
import { pausesAtLimit } from "@/lib/usage-cap";
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
import {
  isSetupComplete,
  ServiceSetupCard,
} from "@/app/[locale]/dashboard/service-setup-card";
import { CONNECTORS_SECTION_ID } from "@/app/[locale]/dashboard/billing-section";
import { getSubscriptionFor } from "@/lib/subscriptions";
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
  const [
    { clientServiceId },
    { calendar, instagram },
    session,
    { active: organization },
    t,
    tPause,
  ] = await Promise.all([
    params,
    searchParams,
    requireUser(),
    requireActiveOrganization(),
    getTranslations("Dashboard.service"),
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
    await viewerOf(session.user.id),
  );

  // Quota affiché une fois la mise en service terminée (solution active).
  const quota =
    item.status === "ACTIVE" && subscription?.cap && subscription.usage
      ? {
          cap: subscription.cap,
          consumedUnits: subscription.usage.consumedUnits,
          overageCents: subscription.usage.overageCents,
          overageAllowed: subscription.overageAllowed,
        }
      : null;
  const isLive = isLiveTelephony(item);
  const objectives = asStringArray(item.configuration.objectives);
  const showBookings =
    isLive &&
    (objectives.includes("appointment") || objectives.includes("order"));
  const isMessaging = MESSAGING_SERVICE_SLUGS.has(item.service.slug);
  const isTelephony = TELEPHONY_SERVICE_SLUGS.has(item.service.slug);
  const showSetup = !isSetupComplete(item);
  // Agenda facultatif : une fois la solution en service sans agenda, une
  // alerte propose de le connecter depuis l'onglet Connecteurs.
  const suggestsCalendar =
    isTelephony &&
    isLive &&
    !showSetup &&
    objectives.includes("appointment") &&
    !item.calendarConnected;
  const hasMainColumn =
    showSetup ||
    (isLive && Boolean(item.externalPhoneNumber)) ||
    showBookings ||
    isMessaging;
  const showProgress = item.status !== "ACTIVE" && item.status !== "CANCELED";
  // Retour de Meta en échec (?instagram=error|in-use), tant que le compte
  // n'est pas connecté.
  const instagramFailure =
    !item.instagramConnected &&
    (instagram === "error" || instagram === "in-use")
      ? instagram
      : null;

  const { scheduled: scheduledBookings, unscheduled: unscheduledBookings } =
    toCalendarBookings(item.bookings, {
      subtitle: (b) => formatFrenchPhone(b.customerPhone),
      isSynced: (b) =>
        !item.calendarConnected ||
        Boolean(b.googleEventId || b.externalBookingId),
    });

  // Le tarif et le quota sont dans le sous-titre : seule la carte d'essai
  // reste à côté de l'activité.
  const testCall =
    isLive && isDemoCallAvailable() ? (
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

      {/* En-tête en deux colonnes à toutes les largeurs : le titre à gauche,
          les actions en haut à droite. La place est mesurée sur l'en-tête
          (requête de conteneur, la barre latérale réduit la largeur) : quand
          elle manque, l'icône de la solution disparaît et les actions
          perdent leur libellé visible. */}
      <header className="@container/header">
        <div className="flex items-start gap-4">
          <div className="hidden @xl/header:block">
            <ServiceGlyphBadge slug={item.service.slug} size="lg" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-foreground [overflow-wrap:anywhere]">
                {item.name}
              </h1>
              {/* Actions en haut à droite. Le badge de statut est posé
                  au-dessus de l'interrupteur de pause : « Actif » ou
                  « En pause » se lit juste à côté de ce qui le change. */}
              <div className="flex shrink-0 items-start gap-x-3 @3xl/header:gap-x-4">
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={item.status} pausedAt={item.pausedAt} />
                  {canManage && canPauseService(item) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span
                        aria-hidden="true"
                        className="hidden @3xl/header:inline"
                      >
                        {tPause("label")}
                      </span>
                      <PauseSwitch
                        clientServiceId={item.clientServiceId}
                        name={item.name}
                        paused={item.pausedAt !== null}
                      />
                    </div>
                  )}
                </div>
                <ServiceDetailActions item={item} />
              </div>
            </div>

            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {item.name !== item.service.name && (
                <span className="block font-medium text-foreground">
                  {item.service.name}
                </span>
              )}
              {item.service.description}
            </p>

            {/* Sous-titre : où en est la solution et, une fois la mise en
                service terminée, ce qui est consommé du forfait sur la
                période. Le tarif est dans les réglages. */}
            <dl className="mt-5 flex flex-wrap gap-x-24 gap-y-5 text-sm">
              {quota && (
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">
                    {t("summary.quota")}
                  </dt>
                  <dd className="mt-1 ">
                    <QuotaMeter
                      cap={quota.cap}
                      consumedUnits={quota.consumedUnits}
                      variant="stacked"
                    />
                  </dd>
                  <dd>
                    <UsageNote
                      cap={quota.cap}
                      consumedUnits={quota.consumedUnits}
                      overageCents={quota.overageCents}
                      pausesAtLimit={pausesAtLimit(
                        quota.cap,
                        quota.overageAllowed,
                      )}
                      className="mt-1 max-w-xs"
                    />
                  </dd>
                </div>
              )}
            </dl>
            {showProgress && (
              <div className="max-w-2xl">
                <ServiceProgress status={item.status} />
              </div>
            )}
          </div>
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
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "mt-3",
              })}
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
              <AlertDescription>
                {t("calendarError.description")}
              </AlertDescription>
            </Alert>
          )}
          {instagramFailure && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>
                {instagramFailure === "in-use"
                  ? t("instagramError.inUseTitle")
                  : t("instagramError.title")}
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
              <AlertDescription className="text-foreground">
                {item.adminNote}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {hasMainColumn ? (
        <div
          className={cn(
            "mt-8 grid items-start gap-6",
            testCall && "lg:grid-cols-3",
          )}
        >
          <div className={cn("min-w-0 space-y-6", testCall && "lg:col-span-2")}>
            {showSetup && (
              <ServiceSetupCard item={item} canManage={canManage} />
            )}
            {/* Appels et calendrier ensemble : deux onglets d'une même carte. */}
            {showBookings && hasLiveCalls(item) ? (
              <ServiceActivityTabs
                calls={<ServiceCallsContent item={item} />}
                calendar={
                  <BookingsCalendar
                    scheduled={scheduledBookings}
                    unscheduled={unscheduledBookings}
                  />
                }
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
            {isMessaging && (
              <ConversationHistory clientServiceId={item.clientServiceId} />
            )}
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
