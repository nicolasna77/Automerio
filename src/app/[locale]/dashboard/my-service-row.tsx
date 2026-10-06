import { useTranslations } from "next-intl";
import { useLabels } from "@/hooks/use-labels";
import { Link } from "@/i18n/navigation";
import { MessageSquareText, Phone, TriangleAlert } from "lucide-react";
import { TELEPHONY_SERVICE_SLUGS, type MyServiceDTO } from "@/lib/catalog";
import { formatFrenchPhone } from "@/lib/phone-format";
import { MonthlyPrice } from "@/components/monthly-price";
import { StatusBadge } from "@/components/status-badge";
import { ServiceGlyph } from "@/components/service-glyph";
import { ResumeCheckoutButton } from "./resume-checkout-button";
import { ServiceActionsMenu } from "./service-detail-actions";
import { ServiceSettingsButton } from "./service-settings-button";
import { UsageCounter } from "./usage-counter";
import { QuotaMeter, type QuotaState } from "./quota-meter";

// Colonnes partagées avec l'en-tête du tableau (MyServices) :
// solution, statut, tarif, réglages et menu d'actions. Le numéro, propre à
// la téléphonie, s'affiche sous le nom plutôt que dans une colonne vide
// pour toutes les autres solutions.
export const SOLUTION_COLUMNS = "minmax(0,1fr) 9.5rem 8.5rem 4.75rem";

// Une solution dans la liste : toute la ligne ouvre le détail ; les actions
// secondaires : les réglages ont leur bouton, la résiliation reste dans « ⋯ ».
export function MyServiceRow({ item, quota }: { item: MyServiceDTO; quota: QuotaState | null }) {
  const t = useTranslations("Dashboard.services.list");
  const labels = useLabels();
  const { service, status } = item;
  const hint = labels.setupAction(item)?.hint ?? null;
  const canResume = status === "PENDING_PAYMENT" || status === "CANCELED";
  // Sans quota (téléphonie souscrite avant les forfaits), on garde le simple
  // compteur d'appels du mois.
  const showCallCount =
    !quota && status === "ACTIVE" && TELEPHONY_SERVICE_SLUGS.has(service.slug);
  const price = service.monthlyPriceCents;

  return (
    <li className="group/row relative transition-colors hover:bg-muted/40 has-[a[data-row-link]:focus-visible]:bg-muted/40">
      <div
        className="grid gap-x-6 gap-y-3 px-4 py-4 sm:px-5 md:grid-cols-(--solution-cols) md:items-center"
        style={{ "--solution-cols": SOLUTION_COLUMNS } as React.CSSProperties}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground">
            <ServiceGlyph slug={service.slug} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            {/* Place réservée aux boutons d'action, en haut à droite sur
                mobile : la jauge, plus bas, garde toute la largeur. */}
            <div className="pr-20 md:pr-0">
              <h3 className="line-clamp-2 text-sm font-semibold text-foreground md:line-clamp-1">
                <Link
                  data-row-link
                  href={`/dashboard/services/${item.clientServiceId}`}
                  className="outline-none after:absolute after:inset-0 group-hover/row:underline focus-visible:underline underline-offset-4"
                >
                  {item.name}
                  <span className="sr-only">{t("seeDetail")}</span>
                </Link>
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {item.name !== service.name ? t("serviceNamePrefix", { name: service.name }) : ""}
                {labels.serviceStatus(item)}
              </p>
              {item.externalPhoneNumber && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="sr-only">{t("numberLabel")}</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {formatFrenchPhone(item.externalPhoneNumber)}
                  </span>
                </p>
              )}
            </div>
            {quota && (
              <div className="mt-3">
                <QuotaMeter cap={quota.cap} consumedUnits={quota.consumedUnits} />
              </div>
            )}
            {showCallCount && (
              <div className="mt-1.5 text-muted-foreground">
                <UsageCounter clientServiceId={item.clientServiceId} variant="inline" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-9 md:contents">
          <div>
            <StatusBadge status={status} />
          </div>

          <div className="md:text-right">
            {price === null ? (
              <span className="text-sm text-muted-foreground">{t("noSubscription")}</span>
            ) : (
              <MonthlyPrice cents={price} />
            )}
          </div>
        </div>

        <div className="absolute top-3 right-2 z-10 flex items-center gap-0.5 md:static md:justify-self-end">
          <ServiceSettingsButton item={item} />
          <ServiceActionsMenu item={item} />
        </div>
      </div>

      {(item.paymentFailedAt || hint || item.adminNote || canResume) && (
        <div className="relative space-y-2 px-4 pb-4 pl-13 sm:px-5 sm:pl-14">
          {item.paymentFailedAt && (
            <p className="relative z-10 flex items-start gap-2 text-sm text-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span>
                {t.rich("paymentFailed", {
                  link: (chunks) => (
                    <Link href="/dashboard/payments" className="font-medium underline underline-offset-4">
                      {chunks}
                    </Link>
                  ),
                })}
              </span>
            </p>
          )}
          {hint && (
            <p className="flex items-start gap-2 text-sm text-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-attention" aria-hidden="true" />
              <span>
                <span className="sr-only">{t("todo")}</span>
                {hint}
              </span>
            </p>
          )}
          {item.adminNote && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MessageSquareText className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-medium text-foreground">{t("teamNote")}</span>
                {item.adminNote}
              </span>
            </p>
          )}
          {canResume && (
            <div className="relative z-10 pt-1">
              <ResumeCheckoutButton clientServiceId={item.clientServiceId} status={status} />
            </div>
          )}
        </div>
      )}
    </li>
  );
}
