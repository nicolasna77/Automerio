import { useTranslations } from "next-intl";
import { useLabels } from "@/hooks/use-labels";
import { Link } from "@/i18n/navigation";
import { MessageSquareText, Phone, TriangleAlert } from "lucide-react";
import { SETUP_ANCHOR, TELEPHONY_SERVICE_SLUGS, canPauseService, formatDate, type MyServiceDTO } from "@/lib/catalog";
import { buttonVariants } from "@/components/ui/button";
import { formatFrenchPhone } from "@/lib/phone-format";
import { MonthlyPrice } from "@/components/monthly-price";
import { StatusBadge } from "@/components/status-badge";
import { ServiceGlyph } from "@/components/service-glyph";
import { ResumeCheckoutButton } from "./resume-checkout-button";
import { ServiceActionsMenu } from "./service-detail-actions";
import { ServiceSettingsButton } from "./service-settings-button";
import { UsageCounter } from "./usage-counter";
import { QuotaMeter, type QuotaState } from "./quota-meter";
import { PauseSwitch } from "./pause-switch";

// Colonnes partagées avec l'en-tête du tableau (SolutionsTable) : solution,
// statut, quota, tarif, puis réglages et menu d'actions. Le numéro, propre à
// la téléphonie, s'affiche sous le nom plutôt que dans une colonne vide pour
// toutes les autres solutions.
export const SOLUTION_COLUMNS = "minmax(0,1fr) 10.5rem 12rem 8.5rem 4.75rem";

// Une solution dans la liste : toute la ligne ouvre le détail ; les actions
// secondaires : les réglages ont leur bouton, la résiliation reste dans « ⋯ ».
export function MyServiceRow({
  item,
  quota,
  canManage,
  showPaymentIssue = true,
}: {
  item: MyServiceDTO;
  quota: QuotaState | null;
  // Responsable de l'organisation : lui seul peut mettre l'assistant en pause.
  canManage: boolean;
  // false sur la vue d'ensemble, où une alerte en tête le signale déjà.
  showPaymentIssue?: boolean;
}) {
  const t = useTranslations("Dashboard.services.list");
  const labels = useLabels();
  const { service, status } = item;
  const setup = labels.setupAction(item);
  const hint = setup?.hint ?? null;
  const paymentFailed = showPaymentIssue && item.paymentFailedAt !== null;
  const canResume = status === "PENDING_PAYMENT" || status === "CANCELED";
  const pausable = canPauseService(item);
  const paused = pausable && item.pausedAt !== null;
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
                {/* En service depuis… ne vaut plus pendant une pause ; une
                    mise en service à terminer reste signalée. */}
                {paused && item.pausedAt && t("pause.pausedSince", { date: formatDate(item.pausedAt) })}
                {paused && status === "ACTIVE" ? null : labels.serviceStatus(item)}
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
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-9 md:contents">
          <div className="flex items-center gap-2.5">
            {pausable && canManage && (
              <PauseSwitch clientServiceId={item.clientServiceId} name={item.name} paused={paused} />
            )}
            <StatusBadge status={status} pausedAt={item.pausedAt} />
          </div>

          {/* Colonne Quota : alignée d'une ligne à l'autre sur ordinateur ; sur
              mobile, en pleine largeur sous le statut et le tarif. */}
          <div className="order-last basis-full md:order-none md:basis-auto">
            {quota ? (
              <QuotaMeter cap={quota.cap} consumedUnits={quota.consumedUnits} />
            ) : showCallCount ? (
              <div className="text-muted-foreground">
                <UsageCounter clientServiceId={item.clientServiceId} variant="inline" />
              </div>
            ) : (
              <span className="hidden text-sm text-muted-foreground md:inline">
                <span aria-hidden="true">—</span>
                <span className="sr-only">{t("noQuota")}</span>
              </span>
            )}
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

      {(paymentFailed || hint || item.adminNote || canResume) && (
        <div className="relative space-y-2 px-4 pb-4 pl-13 sm:px-5 sm:pl-14">
          {paymentFailed && (
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
          {hint && setup && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="flex items-start gap-2 text-sm text-foreground">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-attention" aria-hidden="true" />
                <span>
                  <span className="sr-only">{t("todo")}</span>
                  {hint}
                </span>
              </p>
              <Link
                href={`/dashboard/services/${item.clientServiceId}#${SETUP_ANCHOR}`}
                className={buttonVariants({ size: "sm", variant: "outline", className: "relative z-10" })}
              >
                {setup.cta}
                <span className="sr-only"> {item.name}</span>
              </Link>
            </div>
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
