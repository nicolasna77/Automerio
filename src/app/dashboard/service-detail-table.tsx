import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  asStringArray,
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
import { ConfigureButton } from "./configure-button";
import { InstagramConnection } from "./instagram-connection";
import { MessengerConnection } from "./messenger-connection";
import { UsageCounter } from "./usage-counter";
import { WhatsAppConnection } from "./whatsapp-connection";

export function ServiceDetailTable({ item }: { item: MyServiceDTO }) {
  const isTelephony = TELEPHONY_SERVICE_SLUGS.has(item.service.slug);
  const isLive =
    isTelephony && (item.status === "ACTIVE" || item.status === "CONFIGURING");
  const takesAppointments = asStringArray(
    item.configuration.objectives
  ).includes("appointment");
  const canEditConfig =
    (item.status === "ACTIVE" || item.status === "CONFIGURING") &&
    item.service.configFields.length > 0;
  const showCalendarRow = isLive && takesAppointments && item.calendarConnected;
  const isDeployedStatus = item.status === "ACTIVE" || item.status === "CONFIGURING";
  const isWhatsApp = item.service.slug === WHATSAPP_SERVICE_SLUG;
  const showWhatsAppRow = isWhatsApp && isDeployedStatus && item.whatsappConnected;
  const isFacebook = item.service.slug === FACEBOOK_SERVICE_SLUG;
  const showFacebookRow = isFacebook && isDeployedStatus && item.facebookConnected;
  const isInstagram = item.service.slug === INSTAGRAM_SERVICE_SLUG;
  const showInstagramRow = isInstagram && isDeployedStatus && item.instagramConnected;
  const hasFacts = hasServiceFacts(item, !isLive);

  return (
    <div className="space-y-6">
      {item.adminNote && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-medium text-primary">
            Note de l&apos;équipe Automerio
          </p>
          <p className="mt-1 text-sm text-foreground">{item.adminNote}</p>
        </div>
      )}

      {isLive && item.externalPhoneNumber && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">En direct</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageCounter clientServiceId={item.clientServiceId} />
            <CallActivity clientServiceId={item.clientServiceId} />
          </CardContent>
        </Card>
      )}

      {isLive && item.externalPhoneNumber && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recevoir vos appels</CardTitle>
          </CardHeader>
          <CardContent>
            <CallForwardingGuide targetNumber={item.externalPhoneNumber} />
          </CardContent>
        </Card>
      )}

      {(hasFacts ||
        showCalendarRow ||
        showWhatsAppRow ||
        showFacebookRow ||
        showInstagramRow ||
        canEditConfig) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Configuration</CardTitle>
            {canEditConfig && <ConfigureButton item={item} />}
          </CardHeader>
          <CardContent className="space-y-5">
            {!hasFacts && (
              <p className="text-sm text-muted-foreground">
                Aucun réglage renseigné pour l&apos;instant.
              </p>
            )}
            {hasFacts && <ServiceFacts item={item} showPhoneNumber={!isLive} />}

            {showCalendarRow && (
              <CalendarConnection
                clientServiceId={item.clientServiceId}
                connected={item.calendarConnected}
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
      )}
    </div>
  );
}
