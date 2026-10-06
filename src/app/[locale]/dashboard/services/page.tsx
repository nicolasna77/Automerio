import { titleMetadata } from "@/i18n/metadata";
import { getLabels } from "@/lib/labels-server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireActiveOrganization } from "@/lib/organization";
import { SETUP_ANCHOR, type MyServiceDTO } from "@/lib/catalog";
import { getMySubscriptions } from "@/lib/subscriptions";
import { toMyServiceDTO } from "../get-my-service";
import type { QuotaState } from "../quota-meter";
import { CheckoutNotice } from "../checkout-notice";
import { MyServices } from "../my-services";
import { PageHeader, PageShell } from "@/components/page-shell";
import { SolutionsTabs } from "./solutions-tabs";
import { CATALOGUE_PATH } from "./paths";

export const generateMetadata = titleMetadata("myServices");

export default async function PrestationsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; clientServiceId?: string }>;
}) {
  const [{ active: organization }, params, t, labels] = await Promise.all([
    requireActiveOrganization(),
    searchParams,
    getTranslations("Dashboard.services"),
    getLabels(),
  ]);

  const [clientServices, subscriptions] = await Promise.all([
    db.clientService.findMany({
      where: { organizationId: organization.id },
      include: { service: true },
      orderBy: { createdAt: "desc" },
    }),
    getMySubscriptions(organization.id),
  ]);
  const myServices: MyServiceDTO[] = clientServices.map(toMyServiceDTO);
  // Consommation de la période en cours, pour les solutions qui ont un quota.
  const quotas: Record<string, QuotaState> = {};
  for (const { clientServiceId, cap, usage } of subscriptions) {
    if (cap && usage) quotas[clientServiceId] = { cap, consumedUnits: usage.consumedUnits };
  }

  const checkoutStatus =
    params.checkout === "success" || params.checkout === "canceled"
      ? params.checkout
      : null;

  if (myServices.length === 0 && !checkoutStatus) redirect(CATALOGUE_PATH);

  const checkoutTarget = params.clientServiceId
    ? myServices.find((m) => m.clientServiceId === params.clientServiceId)
    : undefined;
  const checkoutNextStep = checkoutTarget ? labels.setupAction(checkoutTarget) : null;

  return (
    <PageShell size="wide">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link href={CATALOGUE_PATH} className={buttonVariants({ variant: "outline" })}>
            <Plus aria-hidden="true" data-icon="inline-start" />
            {t("add")}
          </Link>
        }
        className="mb-6"
      />
      <SolutionsTabs myCount={myServices.length} />

      {checkoutStatus && (
        <div className="mb-8">
          <CheckoutNotice
            status={checkoutStatus}
            serviceName={checkoutTarget?.name}
            initialStatus={checkoutTarget?.status}
            nextStep={
              checkoutNextStep && checkoutTarget
                ? {
                    cta: checkoutNextStep.cta,
                    href: `/dashboard/services/${checkoutTarget.clientServiceId}#${SETUP_ANCHOR}`,
                  }
                : null
            }
          />
        </div>
      )}

      <MyServices items={myServices} quotas={quotas} />
    </PageShell>
  );
}
