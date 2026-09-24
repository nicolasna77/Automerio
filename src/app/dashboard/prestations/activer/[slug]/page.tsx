import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveOrganization } from "@/lib/organization";
import { getServiceBySlug } from "@/lib/get-catalog";
import { ActivationFlow } from "./activation-flow";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Activer une solution" };

export default async function ActivateServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, { active: organization }] = await Promise.all([
    params,
    requireActiveOrganization(),
  ]);
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  return (
    <PageShell size="form">
      <PageHeader
        breadcrumbs={[
          { label: "Solutions", href: "/dashboard/prestations#catalogue" },
          { label: `Activer ${service.name}` },
        ]}
        title={`Activer ${service.name}`}
        description={`Pour ${organization.name}. Vous réglez l'automatisation, puis vous payez en ligne.`}
        className="mb-0"
      />

      <ActivationFlow service={service} organizationId={organization.id} />
    </PageShell>
  );
}
