import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  asStringArray,
  FACEBOOK_SERVICE_SLUG,
  INSTAGRAM_SERVICE_SLUG,
  needsCalendarConnection,
  needsFacebookConnection,
  needsInstagramConnection,
  needsPhoneNumber,
  needsProductCatalog,
  PRODUCT_CATALOG_FIELD_KEY,
  needsWhatsAppConnection,
  TELEPHONY_SERVICE_SLUGS,
  WHATSAPP_SERVICE_SLUG,
  type MyServiceDTO,
} from "@/lib/catalog";
import { countCatalogItems, readProductCatalog } from "@/lib/product-catalog";
import { CalendarConnection } from "./calendar-connection";
import { InstagramConnection } from "./instagram-connection";
import { MessengerConnection } from "./messenger-connection";
import { PhoneNumberPurchase } from "./phone-number-purchase";
import { WhatsAppConnection } from "./whatsapp-connection";

export function ServiceSetupCard({ item }: { item: MyServiceDTO }) {
  if (item.status === "CANCELED") return null;

  const isTelephony = TELEPHONY_SERVICE_SLUGS.has(item.service.slug);
  const isWhatsApp = item.service.slug === WHATSAPP_SERVICE_SLUG;
  const isFacebook = item.service.slug === FACEBOOK_SERVICE_SLUG;
  const isInstagram = item.service.slug === INSTAGRAM_SERVICE_SLUG;
  const objectives = asStringArray(item.configuration.objectives);
  const takesAppointments = objectives.includes("appointment");
  const takesOrders = objectives.includes("order");

  const paid = item.status !== "PENDING_PAYMENT";
  const hasNumber = Boolean(item.externalPhoneNumber);
  const verified = item.status === "ACTIVE";

  const phoneDone = !isTelephony || hasNumber;
  const calendarDone = !takesAppointments || item.calendarConnected;
  const whatsappDone = !isWhatsApp || item.whatsappConnected;
  const facebookDone = !isFacebook || item.facebookConnected;
  const instagramDone = !isInstagram || item.instagramConnected;
  const catalogDone =
    !takesOrders ||
    countCatalogItems(readProductCatalog(item.configuration[PRODUCT_CATALOG_FIELD_KEY])) > 0;
  if (
    paid &&
    phoneDone &&
    calendarDone &&
    whatsappDone &&
    facebookDone &&
    instagramDone &&
    catalogDone &&
    verified
  )
    return null;

  const steps = [
    { label: "Paiement", done: paid },
    ...(isTelephony
      ? [{ label: "Numéro de téléphone attribué", done: hasNumber }]
      : []),
    ...(isWhatsApp
      ? [{ label: "Compte WhatsApp connecté", done: item.whatsappConnected }]
      : []),
    ...(isFacebook
      ? [{ label: "Page Facebook connectée", done: item.facebookConnected }]
      : []),
    ...(isInstagram
      ? [{ label: "Compte Instagram connecté", done: item.instagramConnected }]
      : []),
    ...(takesOrders ? [{ label: "Carte ajoutée", done: catalogDone }] : []),
    ...(takesAppointments
      ? [{ label: "Agenda connecté", done: item.calendarConnected }]
      : []),
    { label: "Vérification par l'équipe Automerio", done: verified },
  ];

  const nextIsPhone = needsPhoneNumber(item);
  const nextIsWhatsApp = !nextIsPhone && needsWhatsAppConnection(item);
  const nextIsFacebook = !nextIsPhone && !nextIsWhatsApp && needsFacebookConnection(item);
  const nextIsInstagram =
    !nextIsPhone && !nextIsWhatsApp && !nextIsFacebook && needsInstagramConnection(item);
  const nextIsCatalog =
    !nextIsPhone &&
    !nextIsWhatsApp &&
    !nextIsFacebook &&
    !nextIsInstagram &&
    needsProductCatalog(item);
  const nextIsCalendar =
    !nextIsPhone &&
    !nextIsWhatsApp &&
    !nextIsFacebook &&
    !nextIsInstagram &&
    !nextIsCatalog &&
    needsCalendarConnection(item);
  const waitingOnAutomerio =
    paid &&
    phoneDone &&
    calendarDone &&
    whatsappDone &&
    facebookDone &&
    instagramDone &&
    catalogDone &&
    !verified;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mise en service</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="space-y-2">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-2.5 text-sm">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  step.done
                    ? "bg-primary text-primary-foreground"
                    : "border border-dashed border-border"
                )}
              >
                {step.done && <Check className="size-3" />}
              </span>
              <span
                className={cn(
                  step.done ? "text-muted-foreground" : "font-medium text-foreground"
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>

        {!paid && (
          <p className="text-sm text-muted-foreground">
            Finalisez le paiement pour lancer la mise en service — le bouton se
            trouve en haut de cette page.
          </p>
        )}

        {nextIsPhone && (
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Choisissez le numéro qui recevra vos appels
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              L&apos;IA ne peut pas encore décrocher tant qu&apos;aucun numéro
              n&apos;est attribué. Vous pourrez ensuite y renvoyer votre ligne
              actuelle, sans changer de numéro.
            </p>
            <PhoneNumberPurchase clientServiceId={item.clientServiceId} />
          </div>
        )}

        {nextIsWhatsApp && (
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Connectez votre compte WhatsApp Business
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              L&apos;IA ne peut pas encore répondre à vos clients tant qu&apos;aucun
              compte n&apos;est connecté — vous gardez votre numéro actuel.
            </p>
            <WhatsAppConnection
              clientServiceId={item.clientServiceId}
              connected={item.whatsappConnected}
              displayNumber={item.whatsappDisplayNumber}
            />
          </div>
        )}

        {nextIsFacebook && (
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Connectez votre Page Facebook
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              L&apos;IA ne peut pas encore répondre à vos clients tant
              qu&apos;aucune Page n&apos;est connectée.
            </p>
            <MessengerConnection
              clientServiceId={item.clientServiceId}
              connected={item.facebookConnected}
              pageName={item.facebookPageName}
            />
          </div>
        )}

        {nextIsInstagram && (
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Connectez votre compte Instagram
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              L&apos;IA ne peut pas encore répondre à vos clients tant
              qu&apos;aucun compte n&apos;est connecté.
            </p>
            <InstagramConnection
              clientServiceId={item.clientServiceId}
              connected={item.instagramConnected}
              username={item.instagramUsername}
            />
          </div>
        )}

        {nextIsCatalog && (
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Ajoutez votre carte
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              Sans carte, l&apos;IA note les coordonnées de vos clients mais ne
              prend pas leurs commandes. Une photo ou un PDF suffit.
            </p>
            <Link
              href={`/dashboard/services/${item.clientServiceId}/configuration`}
              className={buttonVariants({ size: "sm" })}
            >
              Ajouter ma carte
            </Link>
          </div>
        )}

        {nextIsCalendar && (
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Connectez votre agenda
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              Les rendez-vous pris par téléphone s&apos;ajouteront directement
              dans votre Google Agenda.
            </p>
            <CalendarConnection
              clientServiceId={item.clientServiceId}
              connected={item.calendarConnected}
            />
          </div>
        )}

        {waitingOnAutomerio && (
          <p className="text-sm text-muted-foreground">
            Rien à faire de votre côté : l&apos;équipe Automerio termine la mise
            en service et vous prévient dès que votre solution est active.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
