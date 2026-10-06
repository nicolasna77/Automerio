import { useTranslations } from "next-intl";
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
  const t = useTranslations("Dashboard.setup");
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
    { label: t("steps.payment"), done: paid },
    ...(isTelephony
      ? [{ label: t("steps.phone"), done: hasNumber }]
      : []),
    ...(isWhatsApp
      ? [{ label: t("steps.whatsapp"), done: item.whatsappConnected }]
      : []),
    ...(isFacebook
      ? [{ label: t("steps.facebook"), done: item.facebookConnected }]
      : []),
    ...(isInstagram
      ? [{ label: t("steps.instagram"), done: item.instagramConnected }]
      : []),
    ...(takesOrders ? [{ label: t("steps.catalog"), done: catalogDone }] : []),
    ...(takesAppointments
      ? [{ label: t("steps.calendar"), done: item.calendarConnected, optional: true }]
      : []),
    { label: t("steps.verification"), done: verified },
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
                  <span className="font-normal text-muted-foreground">{t("optional")}</span>
                )}
              </span>
            </li>
          ))}
        </ol>

        {!paid && (
          <p className="text-sm text-muted-foreground">
            {t("payFirst")}
          </p>
        )}

        {nextIsPhone && (
          <div className={box}>
            <p className="text-sm font-medium text-foreground">{t("phone.title")}</p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">{t("phone.description")}</p>
            <PhoneNumberPurchase clientServiceId={item.clientServiceId} />
          </div>
        )}

        {nextIsWhatsApp && (
          <div className={box}>
            <p className="text-sm font-medium text-foreground">{t("whatsapp.title")}</p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">{t("whatsapp.description")}</p>
            <WhatsAppConnection
              clientServiceId={item.clientServiceId}
              connected={item.whatsappConnected}
              displayNumber={item.whatsappDisplayNumber}
            />
          </div>
        )}

        {nextIsFacebook && (
          <div className={box}>
            <p className="text-sm font-medium text-foreground">{t("facebook.title")}</p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">{t("facebook.description")}</p>
            <MessengerConnection
              clientServiceId={item.clientServiceId}
              connected={item.facebookConnected}
              pageName={item.facebookPageName}
            />
          </div>
        )}

        {nextIsInstagram && (
          <div className={box}>
            <p className="text-sm font-medium text-foreground">{t("instagram.title")}</p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">{t("instagram.description")}</p>
            <InstagramConnection
              clientServiceId={item.clientServiceId}
              connected={item.instagramConnected}
              username={item.instagramUsername}
            />
          </div>
        )}

        {nextIsCatalog && (
          <div className={box}>
            <p className="text-sm font-medium text-foreground">{t("catalog.title")}</p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">{t("catalog.description")}</p>
            <Link
              href={`/dashboard/services/${item.clientServiceId}/configuration`}
              className={buttonVariants({ size: "sm" })}
            >
              {t("catalog.cta")}
            </Link>
          </div>
        )}

        {nextIsCalendar && (
          <div className={box}>
            <p className="text-sm font-medium text-foreground">
              {t("calendar.title")} <span className="font-normal text-muted-foreground">{t("optionalTag")}</span>
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">{t("calendar.description")}</p>
            <CalendarConnection
              clientServiceId={item.clientServiceId}
              calendar={item.calendar}
            />
          </div>
        )}

        {waitingOnAutomerio && (
          <p className="text-sm text-muted-foreground">
            {t("waiting")}
          </p>
        )}
    </>
  );

  return (
    <Card id={SETUP_ANCHOR} className="scroll-mt-24">
      <CardHeader>
        <CardTitle as="h2" className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {content}
      </CardContent>
    </Card>
  );
}
