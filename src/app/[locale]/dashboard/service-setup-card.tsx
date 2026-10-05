import { Link } from "@/i18n/navigation";
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
  SETUP_ANCHOR,
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

function setupState(item: MyServiceDTO) {
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
  const whatsappDone = !isWhatsApp || item.whatsappConnected;
  const facebookDone = !isFacebook || item.facebookConnected;
  const instagramDone = !isInstagram || item.instagramConnected;
  const catalogDone =
    !takesOrders ||
    countCatalogItems(readProductCatalog(item.configuration[PRODUCT_CATALOG_FIELD_KEY])) > 0;
  // L'agenda est facultatif : sans lui, l'assistant prend un message au lieu
  // de réserver. La mise en service ne l'attend donc pas.
  const clientDone = paid && phoneDone && whatsappDone && facebookDone && instagramDone && catalogDone;

  return {
    isTelephony,
    isWhatsApp,
    isFacebook,
    isInstagram,
    takesAppointments,
    takesOrders,
    paid,
    hasNumber,
    verified,
    catalogDone,
    clientDone,
  };
}

// Vrai quand la carte « Mise en service » n'a plus rien à montrer.
export function isSetupComplete(item: MyServiceDTO): boolean {
  if (item.status === "CANCELED") return true;
  const { clientDone, verified } = setupState(item);
  return clientDone && verified;
}

export function ServiceSetupCard({
  item,
}: {
  item: MyServiceDTO;
}) {
  if (isSetupComplete(item)) return null;

  const {
    isTelephony,
    isWhatsApp,
    isFacebook,
    isInstagram,
    takesAppointments,
    takesOrders,
    paid,
    hasNumber,
    verified,
    catalogDone,
    clientDone,
  } = setupState(item);

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
      ? [{ label: "Agenda connecté", done: item.calendarConnected, optional: true }]
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
  const waitingOnAutomerio = clientDone && !verified;

  const box = "rounded-lg border border-border bg-muted/40 p-4";

  const content = (
    <>
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
                {step.optional && !step.done && (
                  <span className="font-normal text-muted-foreground"> (facultatif)</span>
                )}
              </span>
            </li>
          ))}
        </ol>

        {!paid && (
          <p className="text-sm text-muted-foreground">
            Finalisez le paiement pour lancer la mise en service. Le bouton se
            trouve en haut de cette page.
          </p>
        )}

        {nextIsPhone && (
          <div className={box}>
            <p className="text-sm font-medium text-foreground">
              Choisissez le numéro qui recevra vos appels
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              L&apos;assistant ne peut pas encore décrocher tant qu&apos;aucun numéro
              n&apos;est attribué. Vous pourrez ensuite y renvoyer votre ligne
              actuelle, sans changer de numéro.
            </p>
            <PhoneNumberPurchase clientServiceId={item.clientServiceId} />
          </div>
        )}

        {nextIsWhatsApp && (
          <div className={box}>
            <p className="text-sm font-medium text-foreground">
              Connectez votre compte WhatsApp Business
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              L&apos;assistant ne peut pas encore répondre à vos clients tant qu&apos;aucun
              compte n&apos;est connecté. Vous gardez votre numéro actuel.
            </p>
            <WhatsAppConnection
              clientServiceId={item.clientServiceId}
              connected={item.whatsappConnected}
              displayNumber={item.whatsappDisplayNumber}
            />
          </div>
        )}

        {nextIsFacebook && (
          <div className={box}>
            <p className="text-sm font-medium text-foreground">
              Connectez votre Page Facebook
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              L&apos;assistant ne peut pas encore répondre à vos clients tant
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
          <div className={box}>
            <p className="text-sm font-medium text-foreground">
              Connectez votre compte Instagram
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              L&apos;assistant ne peut pas encore répondre à vos clients tant
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
          <div className={box}>
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
          <div className={box}>
            <p className="text-sm font-medium text-foreground">
              Connectez votre agenda <span className="font-normal text-muted-foreground">(facultatif)</span>
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              Les rendez-vous pris par téléphone s&apos;ajouteront directement
              dans votre agenda : Google Agenda, Cal.com ou Calendly.
            </p>
            <CalendarConnection
              clientServiceId={item.clientServiceId}
              calendar={item.calendar}
            />
          </div>
        )}

        {waitingOnAutomerio && (
          <p className="text-sm text-muted-foreground">
            Rien à faire de votre côté : l&apos;équipe Automerio termine la mise
            en service et vous prévient dès que votre solution est active.
          </p>
        )}
    </>
  );

  return (
    <Card id={SETUP_ANCHOR} className="scroll-mt-24">
      <CardHeader>
        <CardTitle as="h2" className="text-base">Mise en service</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {content}
      </CardContent>
    </Card>
  );
}
