import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getMyService } from "@/app/dashboard/get-my-service";
import { canEditConfiguration, withCleanProductCatalog } from "@/lib/catalog";
import { ServiceConfigurationForm } from "./service-configuration-form";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Configuration de la solution" };

export default async function ServiceConfigurationPage({
  params,
}: {
  params: Promise<{ clientServiceId: string }>;
}) {
  const { clientServiceId } = await params;
  const session = await requireUser();
  const item = await getMyService(clientServiceId, session.user.id);
  if (!item) notFound();

  const detailHref = `/dashboard/services/${item.clientServiceId}`;
  if (!canEditConfiguration(item)) redirect(detailHref);

  return (
    <PageShell size="form">
      <PageHeader
        breadcrumbs={[
          { label: "Solutions", href: "/dashboard/prestations" },
          { label: item.name, href: detailHref },
          { label: "Configuration" },
        ]}
        title="Configuration"
        description={item.name === item.service.name ? item.service.name : `${item.name}, ${item.service.name}`}
        className="mb-0"
      />

      <ServiceConfigurationForm
        clientServiceId={item.clientServiceId}
        configFields={item.service.configFields}
        initialConfiguration={withCleanProductCatalog(item.configuration)}
        backHref={detailHref}
      />
    </PageShell>
  );
}
