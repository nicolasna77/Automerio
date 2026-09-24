import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireActiveOrganization } from "@/lib/organization";
import { getCatalog } from "@/lib/get-catalog";
import { PageHeader, PageShell } from "@/components/page-shell";
import { ServiceCatalogGrid } from "../service-catalog-grid";
import { SolutionsTabs } from "../solutions-tabs";

export const metadata: Metadata = { title: "Catalogue" };

export default async function CataloguePage() {
  const [{ active: organization }, services] = await Promise.all([
    requireActiveOrganization(),
    getCatalog(),
  ]);

  const clientServices = await db.clientService.findMany({
    where: { organizationId: organization.id },
    select: { serviceId: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  // La plus recente l'emporte : c'est elle que le badge doit refleter.
  const statusByServiceId = Object.fromEntries(
    clientServices.map((cs) => [cs.serviceId, cs.status])
  );
  const catalog = services.filter((s) => s.category === "COMMUNICATION");
  const isFirst = clientServices.length === 0;

  return (
    <PageShell size="wide">
      <PageHeader
        title="Solutions"
        description={
          isFirst
            ? "Choisissez votre première automatisation : l'équipe l'installe et la vérifie pour vous."
            : "Ajoutez une automatisation. Une même solution peut s'activer plusieurs fois, pour plusieurs boutiques par exemple."
        }
        className="mb-6"
      />
      <SolutionsTabs myCount={clientServices.length} />

      <section aria-labelledby="catalogue-heading">
        <h2 id="catalogue-heading" className="sr-only">
          Catalogue
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Prix TTC, le montant hors taxes est rappelé dessous.
        </p>
        <ServiceCatalogGrid services={catalog} statusByServiceId={statusByServiceId} />
      </section>
    </PageShell>
  );
}
