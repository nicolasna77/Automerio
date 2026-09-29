import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { csvResponseHeaders, toCsv } from "@/lib/csv";

export async function GET() {
  await requireAdmin();

  const rows = await db.waitlistEntry.findMany({ orderBy: { createdAt: "desc" } });
  const csv = toCsv(rows, [
    { header: "E-mail", value: (r) => r.email },
    { header: "Nom", value: (r) => r.name },
    { header: "Entreprise", value: (r) => r.company },
    { header: "Téléphone", value: (r) => r.phone },
    { header: "À recontacter", value: (r) => (r.wantsCallback ? "Oui" : "Non") },
    { header: "Informé du lancement", value: (r) => (r.wantsNewsletter ? "Oui" : "Non") },
    { header: "Consentement lancement le", value: (r) => r.newsletterConsentAt },
    { header: "Inscrit le", value: (r) => r.createdAt },
  ]);

  return new Response(csv, { headers: csvResponseHeaders("liste-attente-automerio") });
}
