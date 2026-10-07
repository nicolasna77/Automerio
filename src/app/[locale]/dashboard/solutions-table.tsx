import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import type { MyServiceDTO } from "@/lib/catalog";
import { MyServiceRow, SOLUTION_COLUMNS } from "./my-service-row";
import type { QuotaState } from "./quota-meter";

// Le tableau des solutions, le même sur la vue d'ensemble et sur la page
// Solutions : nom, statut, quota, tarif et actions.
export function SolutionsTable({
  items,
  quotas,
  showPaymentIssues = true,
}: {
  items: MyServiceDTO[];
  quotas: Record<string, QuotaState>;
  showPaymentIssues?: boolean;
}) {
  const t = useTranslations("Dashboard.services.list");
  return (
    <Card className="gap-0 py-0">
      <div
        aria-hidden="true"
        className="hidden border-b border-border bg-muted/40 px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid md:grid-cols-(--solution-cols) md:gap-6"
        style={{ "--solution-cols": SOLUTION_COLUMNS } as React.CSSProperties}
      >
        <span className="pl-9">{t("columns.service")}</span>
        <span>{t("columns.status")}</span>
        <span>{t("columns.quota")}</span>
        <span className="text-right">{t("columns.price")}</span>
        <span />
      </div>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <MyServiceRow
            key={item.clientServiceId}
            item={item}
            quota={quotas[item.clientServiceId] ?? null}
            showPaymentIssue={showPaymentIssues}
          />
        ))}
      </ul>
    </Card>
  );
}
