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

export function ServiceLiveCard({ item }: { item: MyServiceDTO }) {
  if (!isLiveTelephony(item) || !item.externalPhoneNumber) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">Appels reçus</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsageCounter clientServiceId={item.clientServiceId} />
        <CallActivity clientServiceId={item.clientServiceId} />
      </CardContent>
    </Card>
  );
}

export function CallForwardingCard({ item }: { item: MyServiceDTO }) {
  if (!isLiveTelephony(item) || !item.externalPhoneNumber) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">Recevoir vos appels</CardTitle>
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
}: {
  item: MyServiceDTO;
  showUsageCap?: boolean;
}) {
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle as="h2" className="text-base">Réglages</CardTitle>
        {canEditConfig && (
          <Link
            href={`/dashboard/services/${item.clientServiceId}/configuration`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Settings aria-hidden="true" data-icon="inline-start" />
            Modifier
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {hasFacts ? (
          <ServiceFacts item={item} showPhoneNumber={!isLive} showUsageCap={showUsageCap} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun réglage renseigné pour l&apos;instant.
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
      </CardContent>
    </Card>
  );
}
