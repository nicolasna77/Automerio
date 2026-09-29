import { Download, ListChecks } from "lucide-react";
import { titleMetadata } from "@/i18n/metadata";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/catalog";
import { isWaitlistMode } from "@/lib/launch-mode";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("adminWaitlist");

export default async function AdminWaitlistPage() {
  await requireAdmin();

  const entries = await db.waitlistEntry.findMany({ orderBy: { createdAt: "desc" } });
  const callbacks = entries.filter((e) => e.wantsCallback).length;
  const newsletter = entries.filter((e) => e.wantsNewsletter).length;

  return (
    <PageShell size="wide">
      <PageHeader
        title="Liste d'attente"
        description={
          <>
            {entries.length} inscrit{entries.length > 1 ? "s" : ""} : {callbacks} à recontacter,{" "}
            {newsletter} pour l&apos;annonce du lancement.{" "}
            {isWaitlistMode()
              ? "Le site est en mode présentation : seule la page d'accueil est ouverte."
              : "Le site est ouvert : le formulaire n'est plus affiché."}
          </>
        }
        actions={
          entries.length > 0 ? (
            <Link href="/admin/export/waitlist" prefetch={false} className={buttonVariants({ variant: "outline" })}>
              <Download data-icon="inline-start" aria-hidden="true" />
              Exporter en CSV
            </Link>
          ) : null
        }
      />

      {entries.length === 0 ? (
        <EmptyState icon={ListChecks} tone="neutral" title="Personne pour l'instant" description="Les inscriptions du formulaire de la page d'accueil apparaîtront ici." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>À recontacter</TableHead>
                  <TableHead>Lancement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(entry.createdAt)}</TableCell>
                    <TableCell>
                      <a href={`mailto:${entry.email}`} className="underline-offset-4 hover:underline">
                        {entry.email}
                      </a>
                    </TableCell>
                    <TableCell>{entry.name ?? ""}</TableCell>
                    <TableCell>{entry.company ?? ""}</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {entry.phone ? <a href={`tel:${entry.phone}`}>{entry.phone}</a> : ""}
                    </TableCell>
                    <TableCell>{entry.wantsCallback ? "Oui" : "Non"}</TableCell>
                    <TableCell>{entry.wantsNewsletter ? "Oui" : "Non"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
