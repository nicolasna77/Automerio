import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { csvResponseHeaders, toCsv } from "@/lib/csv";
import { STATUS_LABELS, formatCents, type ClientServiceStatus } from "@/lib/catalog";
import { formatCentsExcludingVat } from "@/lib/vat";

export async function GET() {
  await requireAdmin();

  const rows = await db.clientService.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      service: true,
      organization: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });

  const csv = toCsv(rows, [
    { header: "Client", value: (r) => r.user.name },
    { header: "E-mail", value: (r) => r.user.email },
    { header: "Organisation", value: (r) => r.organization.name },
    { header: "Solution", value: (r) => r.service.name },
    { header: "Nom de l'activation", value: (r) => r.name },
    {
      header: "Statut",
      value: (r) => STATUS_LABELS[r.status as ClientServiceStatus] ?? r.status,
    },
    {
      header: "Abonnement mensuel TTC",
      value: (r) =>
        r.service.monthlyPriceCents === null
          ? ""
          : formatCents(r.service.monthlyPriceCents),
    },
    {
      header: "Abonnement mensuel HT",
      value: (r) =>
        r.service.monthlyPriceCents === null
          ? ""
          : formatCentsExcludingVat(r.service.monthlyPriceCents),
    },
    { header: "Code promo", value: (r) => r.promoCode },
    { header: "Numéro attribué", value: (r) => r.externalPhoneNumber },
    { header: "Note pour le client", value: (r) => r.adminNote },
    { header: "Demandée le", value: (r) => r.createdAt },
    { header: "Activée le", value: (r) => r.activatedAt },
    { header: "Résiliée le", value: (r) => r.canceledAt },
  ]);

  return new Response(csv, { headers: csvResponseHeaders("clients-automerio") });
}
