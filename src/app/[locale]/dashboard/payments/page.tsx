import { titleMetadata } from "@/i18n/metadata";
import { getPriceFormatter } from "@/lib/price-format-server";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { PaymentFailedAlert } from "./payment-failed-alert";
import { BillingTabs } from "../billing-tabs";
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
  const [invoices, failing, customerId, activatedCount, t, tBilling] = await Promise.all([
    getMyInvoices(organization.id),
    db.clientService.findMany({
      // Même règle que l'onglet Abonnements : une solution résiliée n'a plus
      // de paiement à régulariser.
      where: {
        organizationId: organization.id,
        paymentFailedAt: { not: null },
        status: { in: ["ACTIVE", "CONFIGURING"] },
      },
      select: { id: true, name: true },
    }),
    organizationCustomerId(organization.id),
    db.clientService.count({ where: { organizationId: organization.id } }),
    getTranslations("Dashboard.payments"),
    getTranslations("Dashboard.billing"),
  ]);
  const price = await getPriceFormatter();

  return (
    <PageShell size="wide">
      <PageHeader
        title={tBilling("title")}
        description={tBilling("description")}
        actions={
          customerId && invoices.length > 0 && <BillingPortalButton organizationId={organization.id} />
        }
        className="mb-6"
      />
      <BillingTabs />

      <div className="mb-8 empty:hidden">
        <PaymentFailedAlert
          names={failing.map((cs) => cs.name)}
          organizationId={organization.id}
          canOpenPortal={Boolean(customerId)}
        />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{t("description", { vat: VAT_PERCENTAGE })}</p>

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
        <Card className="gap-0 py-0">
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
        </Card>
      )}
    </PageShell>
  );
}
