import { CalendarCheck2, Plug } from "lucide-react";
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
}: {
  clientServiceId: string;
  calendar: MyServiceDTO["calendar"];
  takesAppointments: boolean;
}) {
  return (
    <Card id={CONNECTORS_SECTION_ID} className="scroll-mt-24">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plug className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle as="h2" className="text-base">
              Connecteurs
            </CardTitle>
            <CardDescription>
              Les outils reliés à votre assistant. Ces changements s&apos;appliquent tout de suite.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarCheck2 className="size-4 text-muted-foreground" aria-hidden="true" />
            Agenda
          </p>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            {calendar
              ? "L'assistant vérifie vos disponibilités et inscrit les rendez-vous dans cet agenda. Pour en changer, déconnectez-le puis choisissez-en un autre."
              : "Choisissez l'agenda où l'assistant vérifie vos disponibilités et inscrit les rendez-vous : Google Agenda, Cal.com ou Calendly."}
          </p>
          <CalendarConnection clientServiceId={clientServiceId} calendar={calendar} fromSettings />
          {!takesAppointments && (
            <p className="mt-4 text-xs text-muted-foreground">
              L&apos;agenda ne sert qu&apos;aux rendez-vous : cochez « Rendez-vous » dans l&apos;onglet
              « Votre besoin » pour que l&apos;assistant en prenne.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
