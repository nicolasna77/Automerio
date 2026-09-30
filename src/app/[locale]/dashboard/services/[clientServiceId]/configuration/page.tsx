import { titleMetadata } from "@/i18n/metadata";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { getSubscriptionFor } from "@/lib/subscriptions";
import { ServiceBillingCard } from "@/app/[locale]/dashboard/service-billing-card";
import { getMyService } from "@/app/[locale]/dashboard/get-my-service";
import { canEditConfiguration, withCleanProductCatalog } from "@/lib/catalog";
import { ServiceConfigurationForm } from "./service-configuration-form";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("serviceConfiguration");

export default async function ServiceConfigurationPage({
  params,
}: {
  params: Promise<{ clientServiceId: string }>;
}) {
  const [{ clientServiceId }, session, { active: organization }] = await Promise.all([
    params,
    requireUser(),
    requireActiveOrganization(),
  ]);
  // L'abonnement est lu en parallèle ; rien ne s'affiche avant que
  // getMyService ait vérifié l'appartenance de la solution.
  const [item, subscription] = await Promise.all([
    getMyService(clientServiceId, session.user.id),
    getSubscriptionFor(clientServiceId),
  ]);
  if (!item) notFound();

  const detailHref = `/dashboard/services/${item.clientServiceId}`;
  if (!canEditConfiguration(item)) redirect(detailHref);

  return (
    <PageShell size="content">
      <PageHeader
        breadcrumbs={[
          { label: "Solutions", href: "/dashboard/services" },
          { label: item.name, href: detailHref },
          { label: "Réglages" },
        ]}
        title="Réglages"
        description={item.name === item.service.name ? item.service.name : `${item.name}, ${item.service.name}`}
        className="mb-0"
      />

      <ServiceConfigurationForm
        clientServiceId={item.clientServiceId}
        configFields={item.service.configFields}
        initialConfiguration={withCleanProductCatalog(item.configuration)}
        backHref={detailHref}
        companyName={organization.name}
        billingSection={
          subscription ? (
            <ServiceBillingCard subscription={subscription} organizationId={organization.id} />
          ) : null
        }
      />
    </PageShell>
  );
}
