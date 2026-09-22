import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatPrice, type ClientServiceStatus } from "@/lib/catalog";
import { formatPriceExcludingVat } from "@/lib/vat";
import { MarkActiveButton } from "./client-service-actions";
import {
  ConnectionCell,
  NoteCell,
  configEntries,
  type ClientServiceCellData,
} from "./client-service-cells";

export function ClientServiceCard({
  cs,
}: {
  cs: ClientServiceCellData & {
    name: string;
    createdAt: Date;
    organization: { name: string };
    service: {
      slug: string;
      name: string;
      setupFeeCents: number | null;
      monthlyPriceCents: number | null;
      configFields: unknown;
    };
  };
}) {
  return (
    <li className="rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{cs.name}</p>
          {cs.name !== cs.service.name && (
            <p className="text-xs text-muted-foreground">{cs.service.name}</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {cs.organization.name}
          </p>
        </div>
        <StatusBadge status={cs.status as ClientServiceStatus} />
      </div>

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground">Demandée le</dt>
          <dd className="ml-auto text-foreground">{formatDate(cs.createdAt)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground">Prix</dt>
          <dd className="ml-auto text-right text-foreground">
            {formatPrice(cs.service.setupFeeCents, cs.service.monthlyPriceCents)} TTC
            <span className="block text-xs text-muted-foreground">
              soit {formatPriceExcludingVat(cs.service.setupFeeCents, cs.service.monthlyPriceCents)} HT
            </span>
          </dd>
        </div>
      </dl>

      {configEntries(cs).length > 0 && (
        <dl className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
          {configEntries(cs).map((entry) => (
            <div key={entry.key}>
              <dt className="text-xs text-muted-foreground">{entry.label}</dt>
              <dd className="break-words text-foreground">{entry.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4 space-y-3 border-t border-border pt-3">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Note pour le client</p>
          <NoteCell cs={cs} />
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Connexion externe</p>
          <ConnectionCell cs={cs} />
        </div>
        {cs.status === "CONFIGURING" && <MarkActiveButton clientServiceId={cs.id} />}
      </div>
    </li>
  );
}
