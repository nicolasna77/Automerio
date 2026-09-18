import type { Metadata } from "next";
import { FileText, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { formatCents, formatDate } from "@/lib/catalog";
import { getMyInvoices, type InvoiceDTO } from "../get-invoices";
import { BillingPortalButton } from "./billing-portal-button";

export const metadata: Metadata = { title: "Paiements" };

const STATUS_LABEL: Record<string, string> = {
  paid: "Payée",
  open: "En attente",
  draft: "Brouillon",
  uncollectible: "Irrécouvrable",
  void: "Annulée",
};

function InvoiceStatusBadge({ status }: { status: InvoiceDTO["status"] }) {
  const variant =
    status === "paid" ? "default" : status === "uncollectible" || status === "void" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status ? (STATUS_LABEL[status] ?? status) : "—"}</Badge>;
}

export default async function PaiementsPage() {
  const [session, { active: organization }] = await Promise.all([
    requireUser(),
    requireActiveOrganization(),
  ]);
  const [invoices, failing, customer] = await Promise.all([
    getMyInvoices(session.user.id, organization.id),
    db.clientService.findMany({
      where: { organizationId: organization.id, paymentFailedAt: { not: null } },
      select: { id: true, name: true },
    }),
    db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Paiements
          </h1>
          <p className="mt-1 text-muted-foreground">
            Vos factures, par solution. Prix TTC, TVA à 20 % incluse.
          </p>
        </div>
        {customer.stripeCustomerId && invoices.length > 0 && <BillingPortalButton />}
      </div>

      {failing.length > 0 && (
        <div
          role="alert"
          className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <p className="flex items-start gap-2 text-sm text-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <span>
              Le dernier paiement de{" "}
              {failing.map((cs) => `« ${cs.name} »`).join(", ")} a été refusé.
              Mettez à jour votre moyen de paiement pour éviter une interruption.
            </span>
          </p>
          {customer.stripeCustomerId && <BillingPortalButton variant="default" />}
        </div>
      )}

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun paiement pour l'instant"
          description="Vos factures apparaîtront ici dès l'activation d'une solution."
        />
      ) : (
        <div className="rounded-3xl border border-border bg-card">
          <Table>
            <TableCaption className="sr-only">Historique des factures</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Solution</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Facture</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium text-foreground">
                    {invoice.serviceName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invoice.createdAt)}
                  </TableCell>
                  <TableCell className="tabular-nums text-foreground">
                    {formatCents(invoice.amountPaidCents)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {invoice.hostedInvoiceUrl || invoice.invoicePdfUrl ? (
                      <a
                        href={invoice.hostedInvoiceUrl ?? invoice.invoicePdfUrl!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
                      >
                        <FileText className="size-3.5" aria-hidden="true" />
                        Voir
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
