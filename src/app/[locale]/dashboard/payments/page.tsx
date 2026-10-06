import { titleMetadata } from "@/i18n/metadata";
import { getPriceFormatter } from "@/lib/price-format-server";
import { FileText, TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { requireActiveOrganization } from "@/lib/organization";
import { formatDate, formatEuroAmount } from "@/lib/catalog";
import { getMyInvoices, type InvoiceDTO } from "../get-invoices";
import { organizationCustomerId } from "@/lib/organization-billing";
import { BillingPortalButton } from "./billing-portal-button";
import { VAT_PERCENTAGE } from "@/lib/vat";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("payments");

const INVOICE_STATUSES = ["paid", "open", "draft", "uncollectible", "void"] as const;
type KnownInvoiceStatus = (typeof INVOICE_STATUSES)[number];

function InvoiceStatusBadge({ status }: { status: InvoiceDTO["status"] }) {
  const t = useTranslations("Dashboard.payments.status");
  const variant =
    status === "paid" ? "default" : status === "uncollectible" || status === "void" ? "destructive" : "secondary";
  const known = (INVOICE_STATUSES as readonly string[]).includes(status ?? "");
  return (
    <Badge variant={variant}>
      {!status ? t("unknown") : known ? t(status as KnownInvoiceStatus) : status}
    </Badge>
  );
}

export default async function PaiementsPage() {
  const { active: organization } = await requireActiveOrganization();
  const [invoices, failing, customerId, activatedCount, t, tSubscriptions] = await Promise.all([
    getMyInvoices(organization.id),
    db.clientService.findMany({
      where: { organizationId: organization.id, paymentFailedAt: { not: null } },
      select: { id: true, name: true },
    }),
    organizationCustomerId(organization.id),
    db.clientService.count({ where: { organizationId: organization.id } }),
    getTranslations("Dashboard.payments"),
    getTranslations("Dashboard.subscriptions"),
  ]);
  const price = await getPriceFormatter();

  return (
    <PageShell size="wide">
      <PageHeader
        title={t("title")}
        description={t("description", { vat: VAT_PERCENTAGE })}
        actions={
          customerId && invoices.length > 0 && <BillingPortalButton organizationId={organization.id} />
        }
      />

      {failing.length > 0 && (
        <div
          role="alert"
          className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <p className="flex items-start gap-2 text-sm text-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <span>
              {tSubscriptions("failing", {
                names: failing.map((cs) => tSubscriptions("quoted", { name: cs.name })).join(", "),
              })}
            </span>
          </p>
          {customerId && <BillingPortalButton organizationId={organization.id} variant="default" />}
        </div>
      )}

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("empty.title")}
          description={activatedCount > 0 ? t("empty.afterActivation") : t("empty.beforeActivation")}
          action={
            activatedCount > 0 ? (
              <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/subscriptions" />}>
                {t("empty.subscriptions")}
              </Button>
            ) : (
              <Button nativeButton={false} render={<Link href="/dashboard/services/catalog" />}>
                {t("empty.catalog")}
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableCaption className="sr-only">{t("table.caption")}</TableCaption>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-5">{t("table.service")}</TableHead>
                <TableHead>{t("table.date")}</TableHead>
                <TableHead className="text-right">{t("table.amount")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead className="pr-5 text-right">{t("table.invoice")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="pl-5 font-medium text-foreground">
                    {invoice.serviceName ?? t("table.unknownService")}
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                    {formatDate(invoice.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono tabular-nums text-foreground">
                      {formatEuroAmount(invoice.amountPaidCents)}
                    </span>
                    <span className="text-muted-foreground">{t("table.inclVat")}</span>
                    <span className="block text-xs text-muted-foreground">
                      {price.excludingVatSuffix(invoice.amountPaidCents)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {invoice.hostedInvoiceUrl || invoice.invoicePdfUrl ? (
                      <a
                        href={invoice.hostedInvoiceUrl ?? invoice.invoicePdfUrl!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
                      >
                        <FileText className="size-3.5" aria-hidden="true" />
                        {t("table.view")}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">{t("table.unavailable")}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageShell>
  );
}
