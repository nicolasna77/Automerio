import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveOrganization } from "@/lib/organization";
import { getServiceBySlug } from "@/lib/get-catalog";
import { clampToStep } from "@/lib/subscription-pricing";
import { ActivationFlow } from "./activation-flow";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Activer une solution" };

export default async function ActivateServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ minutes?: string | string[] }>;
}) {
  const [{ slug }, { minutes }, { active: organization }] = await Promise.all([
    params,
    searchParams,
    requireActiveOrganization(),
  ]);
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  // Le volume choisi sur la page publique, ramene dans les bornes : une URL
  // retouchee ne fait que deplacer le curseur, le serveur revalide au paiement.
  const requested = typeof minutes === "string" ? Number(minutes) : NaN;
  const initialUnits =
    service.tier && Number.isFinite(requested) ? clampToStep(service.tier, requested) : null;

  return (
    <PageShell size="form">
      <PageHeader
        breadcrumbs={[
          { label: "Catalogue", href: "/dashboard/prestations/catalogue" },
          { label: `Activer ${service.name}` },
        ]}
        title={`Activer ${service.name}`}
        description={`Pour ${organization.name}. Vous réglez l'automatisation, puis vous payez en ligne.`}
        className="mb-0"
      />

      <ActivationFlow
        service={service}
        organizationId={organization.id}
        initialUnits={initialUnits}
      />
    </PageShell>
  );
}
