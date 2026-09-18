import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireActiveOrganization } from "@/lib/organization";
import { getCatalog } from "@/lib/get-catalog";
import { SETUP_ANCHOR, setupAction, type MyServiceDTO } from "@/lib/catalog";
import { toMyServiceDTO } from "../get-my-service";
import { CheckoutNotice } from "../checkout-notice";
import { MyServices } from "../my-services";
import { ServiceCatalogGrid } from "./service-catalog-grid";

export const metadata: Metadata = { title: "Solutions" };

export default async function PrestationsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; clientServiceId?: string }>;
}) {
  const [{ active: organization }, params, services] = await Promise.all([
    requireActiveOrganization(),
    searchParams,
    getCatalog(),
  ]);

  const clientServices = await db.clientService.findMany({
    where: { organizationId: organization.id },
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });

  const statusByServiceId = Object.fromEntries(
    clientServices.map((cs) => [cs.serviceId, cs.status])
  );
  const catalog = services.filter((s) => s.category === "COMMUNICATION");
  const myServices: MyServiceDTO[] = clientServices.map(toMyServiceDTO);

  const checkoutStatus =
    params.checkout === "success" || params.checkout === "canceled"
      ? params.checkout
      : null;
  const checkoutTarget = params.clientServiceId
    ? myServices.find((m) => m.clientServiceId === params.clientServiceId)
    : undefined;
  const checkoutNextStep = checkoutTarget ? setupAction(checkoutTarget) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Solutions</h1>
      <p className="mt-1 text-muted-foreground">
        {myServices.length > 0
          ? "Vos automatisations activées et le catalogue disponible."
          : "Choisissez votre première automatisation : l'équipe l'installe et la vérifie pour vous."}
      </p>

      {checkoutStatus && (
        <div className="mt-6">
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

      {myServices.length > 0 && (
        <div className="mt-8">
          <MyServices items={myServices} />
        </div>
      )}

      <section id="catalogue" aria-labelledby="catalogue-heading" className="mt-10 scroll-mt-20">
        <h2 id="catalogue-heading" className="text-lg font-semibold text-foreground">
          Catalogue
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Prix TTC. Vous pouvez activer une même solution plusieurs fois, pour plusieurs boutiques par exemple.
        </p>
        <ServiceCatalogGrid services={catalog} statusByServiceId={statusByServiceId} />
      </section>
    </div>
  );
}
