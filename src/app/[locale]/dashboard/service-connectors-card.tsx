import { AlertTriangle, CalendarCheck2, Plug } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MyServiceDTO } from "@/lib/catalog";
import { CalendarConnection } from "./calendar-connection";
import { CONNECTORS_SECTION_ID } from "./billing-section";

// Section « Connecteurs » des réglages d'une solution de prise de rendez-vous :
// connecter, changer ou déconnecter l'agenda où l'assistant réserve. Comme
// l'abonnement, ces actions s'appliquent tout de suite.
export function ServiceConnectorsCard({
  clientServiceId,
  calendar,
  takesAppointments,
  connectionFailed = false,
}: {
  clientServiceId: string;
  calendar: MyServiceDTO["calendar"];
  takesAppointments: boolean;
  // Retour de Google en échec (?calendar=error).
  connectionFailed?: boolean;
}) {
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
      <CardContent className="space-y-4">
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
          <CalendarConnection clientServiceId={clientServiceId} calendar={calendar} fromSettings />
          {!takesAppointments && (
            <p className="mt-4 text-xs text-muted-foreground">
              {t("appointmentsOnly")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
