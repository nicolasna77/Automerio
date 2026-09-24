import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireActiveOrganization } from "@/lib/organization";
import { SETUP_ANCHOR, setupAction, type MyServiceDTO } from "@/lib/catalog";
import { toMyServiceDTO } from "../get-my-service";
import { CheckoutNotice } from "../checkout-notice";
import { MyServices } from "../my-services";
import { PageHeader, PageShell } from "@/components/page-shell";
import { SolutionsTabs } from "./solutions-tabs";
import { CATALOGUE_PATH } from "./paths";

export const metadata: Metadata = { title: "Mes solutions" };

export default async function PrestationsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; clientServiceId?: string }>;
}) {
  const [{ active: organization }, params] = await Promise.all([
    requireActiveOrganization(),
    searchParams,
  ]);

  const clientServices = await db.clientService.findMany({
    where: { organizationId: organization.id },
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });
  const myServices: MyServiceDTO[] = clientServices.map(toMyServiceDTO);

  const checkoutStatus =
    params.checkout === "success" || params.checkout === "canceled"
      ? params.checkout
      : null;

  // Rien d'active : une liste vide n'apprend rien, le catalogue si. Le retour
  // de Stripe reste ici, pour afficher son message quoi qu'il arrive.
  if (myServices.length === 0 && !checkoutStatus) redirect(CATALOGUE_PATH);

  const checkoutTarget = params.clientServiceId
    ? myServices.find((m) => m.clientServiceId === params.clientServiceId)
    : undefined;
  const checkoutNextStep = checkoutTarget ? setupAction(checkoutTarget) : null;

  return (
    <PageShell size="wide">
      <PageHeader
        title="Solutions"
        description="Les automatisations que vous avez activées, et où en est chacune."
        actions={
          <Link href={CATALOGUE_PATH} className={buttonVariants({ variant: "outline" })}>
            <Plus aria-hidden="true" data-icon="inline-start" />
            Ajouter une solution
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

      <MyServices items={myServices} />
    </PageShell>
  );
}
