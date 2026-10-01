import { titleMetadata } from "@/i18n/metadata";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { getSubscriptionFor, isRunning } from "@/lib/subscriptions";
import { ServiceBillingCard } from "@/app/[locale]/dashboard/service-billing-card";
import { ServiceConnectorsCard } from "@/app/[locale]/dashboard/service-connectors-card";
import { getMyService } from "@/app/[locale]/dashboard/get-my-service";
import { asStringArray, canEditConfiguration, withCleanProductCatalog } from "@/lib/catalog";
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
  // Sans réglage, la page reste utile pour l'abonnement (volume, moyen de
  // paiement) tant qu'il est en cours.
  const billingOpen = subscription !== null && isRunning(subscription);
  if (!canEditConfiguration(item) && !billingOpen) redirect(detailHref);

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
        connectorsSection={
          // Seule la prise de rendez-vous se relie à un agenda.
          item.service.slug === "prise-rdv-telephone" && canEditConfiguration(item) ? (
            <ServiceConnectorsCard
              clientServiceId={item.clientServiceId}
              calendar={item.calendar}
              takesAppointments={asStringArray(item.configuration.objectives).includes("appointment")}
            />
          ) : null
        }
        billingSection={
          subscription ? (
            <ServiceBillingCard subscription={subscription} organizationId={organization.id} />
          ) : null
        }
      />
    </PageShell>
  );
}
