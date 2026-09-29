import { Link } from "@/i18n/navigation";
import { MessageSquareText, TriangleAlert } from "lucide-react";
import {
  describeServiceStatus,
  formatCents,
  setupHint,
  TELEPHONY_SERVICE_SLUGS,
  type MyServiceDTO,
} from "@/lib/catalog";
import { formatFrenchPhone } from "@/lib/phone-format";
import { excludingVatSuffix } from "@/lib/vat";
import { StatusBadge } from "@/components/status-badge";
import { ServiceGlyph } from "@/components/service-glyph";
import { ResumeCheckoutButton } from "./resume-checkout-button";
import { ServiceActionsMenu } from "./service-detail-actions";
import { UsageCounter } from "./usage-counter";

// Colonnes partagées avec l'en-tête du tableau (MyServices) :
// solution, statut, numéro, tarif, menu d'actions.
export const SOLUTION_COLUMNS = "minmax(0,1fr) 9.5rem 10rem 8.5rem 2.25rem";

// Une solution dans la liste : toute la ligne ouvre le détail ; les actions
// secondaires (configuration, résiliation) restent dans le menu « ⋯ ».
export function MyServiceRow({ item }: { item: MyServiceDTO }) {
  const { service, status } = item;
  const hint = setupHint(item);
  const canResume = status === "PENDING_PAYMENT" || status === "CANCELED";
  const showUsage = status === "ACTIVE" && TELEPHONY_SERVICE_SLUGS.has(service.slug);
  const price = service.monthlyPriceCents;

  return (
    <li className="group/row relative transition-colors hover:bg-muted/40 has-[a[data-row-link]:focus-visible]:bg-muted/40">
      <div
        className="grid gap-x-6 gap-y-3 px-4 py-4 sm:px-5 md:grid-cols-(--solution-cols) md:items-center"
        style={{ "--solution-cols": SOLUTION_COLUMNS } as React.CSSProperties}
      >
        <div className="flex min-w-0 items-start gap-3 pr-10 md:pr-0">
          <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground">
            <ServiceGlyph slug={service.slug} className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground md:line-clamp-1">
              <Link
                data-row-link
                href={`/dashboard/services/${item.clientServiceId}`}
                className="outline-none after:absolute after:inset-0 group-hover/row:underline focus-visible:underline underline-offset-4"
              >
                {item.name}
                <span className="sr-only">, voir le détail</span>
              </Link>
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {item.name !== service.name ? `${service.name}. ` : ""}
              {describeServiceStatus(item)}
            </p>
            {showUsage && (
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

          <div className="font-mono text-sm tabular-nums text-foreground">
            {item.externalPhoneNumber && formatFrenchPhone(item.externalPhoneNumber)}
          </div>

          <div className="md:text-right">
            {price === null ? (
              <span className="text-sm text-muted-foreground">Sans abonnement</span>
            ) : (
              <>
                <p className="font-mono text-sm tabular-nums text-foreground">
                  {formatCents(price).replace(/\s€$/, "")}
                  <span className="font-sans text-muted-foreground"> € TTC/mois</span>
                </p>
                <p className="hidden text-xs text-muted-foreground md:block">
                  {excludingVatSuffix(price)}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="absolute top-3 right-2 z-10 md:static md:justify-self-end">
          <ServiceActionsMenu item={item} />
        </div>
      </div>

      {(item.paymentFailedAt || hint || item.adminNote || canResume) && (
        <div className="relative space-y-2 px-4 pb-4 pl-13 sm:px-5 sm:pl-14">
          {item.paymentFailedAt && (
            <p className="relative z-10 flex items-start gap-2 text-sm text-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span>
                Le dernier paiement a été refusé.{" "}
                <Link href="/dashboard/payments" className="font-medium underline underline-offset-4">
                  Mettez à jour votre moyen de paiement
                </Link>{" "}
                pour éviter une interruption.
              </span>
            </p>
          )}
          {hint && (
            <p className="flex items-start gap-2 text-sm text-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-attention" aria-hidden="true" />
              <span>
                <span className="sr-only">À faire : </span>
                {hint}
              </span>
            </p>
          )}
          {item.adminNote && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MessageSquareText className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-medium text-foreground">Note de l&apos;équipe : </span>
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
