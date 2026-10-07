import { titleMetadata } from "@/i18n/metadata";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireActiveOrganization } from "@/lib/organization";
import { getServiceBySlug } from "@/lib/get-catalog";
import { clampToStep } from "@/lib/subscription-pricing";
import { ActivationFlow } from "./activation-flow";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("activateService");

export default async function ActivateServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ minutes?: string | string[] }>;
}) {
  const [{ slug }, { minutes }, { active: organization }, t] = await Promise.all([
    params,
    searchParams,
    requireActiveOrganization(),
    getTranslations("Dashboard.activation.page"),
  ]);
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const requested = typeof minutes === "string" ? Number(minutes) : NaN;
  const initialUnits =
    service.tier && Number.isFinite(requested) ? clampToStep(service.tier, requested) : null;

  return (
    <PageShell size="content">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb"), href: "/dashboard/services/catalog" },
          { label: t("title", { name: service.name }) },
        ]}
        title={t("title", { name: service.name })}
        description={t("description", { organization: organization.name })}
        className="mb-0"
      />

      <ActivationFlow
        service={service}
        organizationId={organization.id}
        organizationName={organization.name}
        initialUnits={initialUnits}
      />
    </PageShell>
  );
}
