import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { csvResponseHeaders, toCsv } from "@/lib/csv";
import { HELP_REQUEST_STATUS_LABELS } from "@/lib/help";

export async function GET() {
  await requireAdmin();

  const rows = await db.helpRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      user: { select: { name: true, email: true } },
      organization: { select: { name: true } },
      clientService: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" }, select: { createdAt: true, fromTeam: true } },
    },
  });

  const csv = toCsv(rows, [
    { header: "Client", value: (r) => r.user.name },
    { header: "E-mail", value: (r) => r.user.email },
    { header: "Organisation", value: (r) => r.organization?.name ?? "" },
    { header: "Solution concernée", value: (r) => r.clientService?.name ?? "" },
    { header: "Sujet", value: (r) => r.subject },
    { header: "Message", value: (r) => r.message },
    { header: "Statut", value: (r) => HELP_REQUEST_STATUS_LABELS[r.status] },
    { header: "Réponses de l'équipe", value: (r) => r.messages.filter((m) => m.fromTeam).length },
    {
      header: "Première réponse le",
      value: (r) => r.messages.find((m) => m.fromTeam)?.createdAt ?? "",
    },
    { header: "Reçue le", value: (r) => r.createdAt },
    { header: "Résolue le", value: (r) => r.resolvedAt },
  ]);

  return new Response(csv, { headers: csvResponseHeaders("demandes-aide-automerio") });
}
