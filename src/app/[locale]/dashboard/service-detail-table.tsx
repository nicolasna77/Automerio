import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Settings } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  asStringArray,
  canEditConfiguration,
  FACEBOOK_SERVICE_SLUG,
  INSTAGRAM_SERVICE_SLUG,
  TELEPHONY_SERVICE_SLUGS,
  WHATSAPP_SERVICE_SLUG,
  type MyServiceDTO,
} from "@/lib/catalog";
import { ServiceFacts, hasServiceFacts } from "@/components/service-facts";
import { CalendarConnection } from "./calendar-connection";
import { CallActivity } from "./call-activity";
import { CallForwardingGuide } from "./call-forwarding-guide";
import { InstagramConnection } from "./instagram-connection";
import { MessengerConnection } from "./messenger-connection";
import { UsageCounter } from "./usage-counter";
import { WhatsAppConnection } from "./whatsapp-connection";

// Les cartes de la page de détail d'une solution. La page les répartit entre
// sa colonne principale (activité) et sa colonne latérale (réglages).

export function isLiveTelephony(item: MyServiceDTO): boolean {
  return (
    TELEPHONY_SERVICE_SLUGS.has(item.service.slug) &&
    (item.status === "ACTIVE" || item.status === "CONFIGURING")
  );
}

export function hasLiveCalls(item: MyServiceDTO): boolean {
  return isLiveTelephony(item) && Boolean(item.externalPhoneNumber);
}

// Contenu de « Appels reçus », seul ou dans l'onglet de la carte d'activité.
export function ServiceCallsContent({ item }: { item: MyServiceDTO }) {
  return (
    <div className="space-y-4">
      <UsageCounter clientServiceId={item.clientServiceId} />
      <CallActivity clientServiceId={item.clientServiceId} />
    </div>
  );
}

export function ServiceLiveCard({ item }: { item: MyServiceDTO }) {
  const t = useTranslations("Dashboard.service");
  if (!hasLiveCalls(item)) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">{t("calls")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ServiceCallsContent item={item} />
      </CardContent>
    </Card>
  );
}

export function CallForwardingCard({ item }: { item: MyServiceDTO }) {
  const t = useTranslations("Dashboard.service");
  if (!isLiveTelephony(item) || !item.externalPhoneNumber) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">{t("forwarding")}</CardTitle>
      </CardHeader>
      <CardContent>
        <CallForwardingGuide targetNumber={item.externalPhoneNumber} />
      </CardContent>
    </Card>
  );
}

export function ServiceConfigurationCard({
  item,
  showUsageCap = true,
  variant = "side",
}: {
  item: MyServiceDTO;
  showUsageCap?: boolean;
  // « embedded » : sous le titre de la page, dans la même carte, en grille et
  // sans bouton Modifier (le bouton Réglages est déjà en haut à droite).
  variant?: "side" | "embedded";
}) {
  const t = useTranslations("Dashboard.service");
  const isLive = isLiveTelephony(item);
  const takesAppointments = asStringArray(item.configuration.objectives).includes("appointment");
  const canEditConfig = canEditConfiguration(item);
  const showCalendarRow = isLive && takesAppointments && item.calendarConnected;
  const isDeployedStatus = item.status === "ACTIVE" || item.status === "CONFIGURING";
  const showWhatsAppRow =
    item.service.slug === WHATSAPP_SERVICE_SLUG && isDeployedStatus && item.whatsappConnected;
  const showFacebookRow =
    item.service.slug === FACEBOOK_SERVICE_SLUG && isDeployedStatus && item.facebookConnected;
  const showInstagramRow =
    item.service.slug === INSTAGRAM_SERVICE_SLUG && isDeployedStatus && item.instagramConnected;
  const hasFacts = hasServiceFacts(item, !isLive, showUsageCap);

  if (
    !hasFacts &&
    !showCalendarRow &&
    !showWhatsAppRow &&
    !showFacebookRow &&
    !showInstagramRow &&
    !canEditConfig
  )
    return null;

  const body = (
    <>
        {hasFacts ? (
          <ServiceFacts
            item={item}
            showPhoneNumber={!isLive}
            showUsageCap={showUsageCap}
            layout={variant === "embedded" ? "grid" : "list"}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("noSettings")}
          </p>
        )}

        {showCalendarRow && (
          <CalendarConnection
            clientServiceId={item.clientServiceId}
            calendar={item.calendar}
          />
        )}
        {showWhatsAppRow && (
          <WhatsAppConnection
            clientServiceId={item.clientServiceId}
            connected={item.whatsappConnected}
            displayNumber={item.whatsappDisplayNumber}
          />
        )}
        {showFacebookRow && (
          <MessengerConnection
            clientServiceId={item.clientServiceId}
            connected={item.facebookConnected}
            pageName={item.facebookPageName}
          />
        )}
        {showInstagramRow && (
          <InstagramConnection
            clientServiceId={item.clientServiceId}
            connected={item.instagramConnected}
            username={item.instagramUsername}
          />
        )}
    </>
  );

  if (variant === "embedded") {
    // Sous le titre de la page, dans la même carte : un simple intertitre.
    return (
      <section aria-labelledby={`${item.clientServiceId}-informations`}>
        <h2 id={`${item.clientServiceId}-informations`} className="text-sm font-medium text-foreground">
          {t("information")}
        </h2>
        <div className="mt-4 space-y-5">{body}</div>
      </section>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle as="h2" className="text-base">
          {t("settings")}
        </CardTitle>
        {canEditConfig && (
          <Link
            href={`/dashboard/services/${item.clientServiceId}/configuration`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Settings aria-hidden="true" data-icon="inline-start" />
            {t("edit")}
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {body}
      </CardContent>
    </Card>
  );
}
