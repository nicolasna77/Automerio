import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TELEPHONY_SERVICE_SLUGS, type MyServiceDTO } from "@/lib/catalog";
import { CallActivity } from "./call-activity";
import { CallForwardingGuide } from "./call-forwarding-guide";
import { UsageCounter } from "./usage-counter";

// Les cartes d'activité de la page de détail d'une solution de téléphonie.

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
