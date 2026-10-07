import { AlertTriangle, CalendarCheck2, MessageCircle, Plug } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FACEBOOK_SERVICE_SLUG,
  INSTAGRAM_SERVICE_SLUG,
  WHATSAPP_SERVICE_SLUG,
  type MyServiceDTO,
} from "@/lib/catalog";
import { CalendarConnection } from "./calendar-connection";
import { CONNECTORS_SECTION_ID } from "./billing-section";
import { InstagramConnection } from "./instagram-connection";
import { MessengerConnection } from "./messenger-connection";
import { WhatsAppConnection } from "./whatsapp-connection";
import { ManagersOnlyNote } from "./managers-only-note";

// Carte « Connecteurs » commune à l'agenda et aux messageries.
function ConnectorsShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Dashboard.settingsCards.connectors");
  return (
    <Card id={CONNECTORS_SECTION_ID} className="scroll-mt-24">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plug className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle as="h2" className="text-base">
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

// Section « Connecteurs » des réglages d'une solution de prise de rendez-vous :
// connecter, changer ou déconnecter l'agenda où l'assistant réserve. Comme
// l'abonnement, ces actions s'appliquent tout de suite.
export function ServiceConnectorsCard({
  clientServiceId,
  calendar,
  takesAppointments,
  connectionFailed = false,
  canManage,
}: {
  clientServiceId: string;
  // Propriétaire ou administrateur de l'entreprise : seul à pouvoir connecter.
  canManage: boolean;
  calendar: MyServiceDTO["calendar"];
  takesAppointments: boolean;
  // Retour de Google en échec (?calendar=error).
  connectionFailed?: boolean;
}) {
  const t = useTranslations("Dashboard.settingsCards.connectors");
  return (
    <ConnectorsShell>
        {connectionFailed && !calendar && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{t("errorBody")}</AlertDescription>
          </Alert>
        )}
        <div className="rounded-lg border border-border p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarCheck2 className="size-4 text-muted-foreground" aria-hidden="true" />
            {t("calendar")}
          </p>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            {calendar ? t("connected") : t("notConnected")}
          </p>
          {canManage ? (
            <CalendarConnection clientServiceId={clientServiceId} calendar={calendar} fromSettings />
          ) : (
            <ManagersOnlyNote />
          )}
          {!takesAppointments && (
            <p className="mt-4 text-xs text-muted-foreground">
              {t("appointmentsOnly")}
            </p>
          )}
        </div>
    </ConnectorsShell>
  );
}

// Section « Connecteurs » d'une messagerie : le compte WhatsApp, la page
// Facebook ou le compte Instagram sur lequel l'assistant répond, pour le
// connecter, en changer ou le déconnecter.
export function MessagingConnectorsCard({ item, canManage }: { item: MyServiceDTO; canManage: boolean }) {
  const t = useTranslations("Dashboard.settingsCards.connectors");
  const slug = item.service.slug;
  return (
    <ConnectorsShell>
      <div className="rounded-lg border border-border p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageCircle className="size-4 text-muted-foreground" aria-hidden="true" />
          {t("messagingAccount")}
        </p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("messagingDescription")}</p>
        {!canManage && <ManagersOnlyNote />}
        {canManage && slug === WHATSAPP_SERVICE_SLUG && (
          <WhatsAppConnection
            clientServiceId={item.clientServiceId}
            connected={item.whatsappConnected}
            displayNumber={item.whatsappDisplayNumber}
          />
        )}
        {canManage && slug === FACEBOOK_SERVICE_SLUG && (
          <MessengerConnection
            clientServiceId={item.clientServiceId}
            connected={item.facebookConnected}
            pageName={item.facebookPageName}
          />
        )}
        {canManage && slug === INSTAGRAM_SERVICE_SLUG && (
          <InstagramConnection
            clientServiceId={item.clientServiceId}
            connected={item.instagramConnected}
            username={item.instagramUsername}
          />
        )}
      </div>
    </ConnectorsShell>
  );
}
