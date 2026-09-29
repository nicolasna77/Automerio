import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireActiveOrganization } from "@/lib/organization";
import {
  toHelpRequestMessageDTOs,
  type HelpRequestDTO,
  type HelpRequestServiceOption,
} from "@/lib/help";
import { HelpRequestForm } from "./help-request-form";
import { HelpRequestHistory } from "./help-request-history";
import { HowItWorks } from "./how-it-works";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Aide" };

export default async function AidePage() {
  const { active: organization } = await requireActiveOrganization();

  const [clientServices, helpRequests] = await Promise.all([
    db.clientService.findMany({
      where: { organizationId: organization.id },
      select: { id: true, name: true, service: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.helpRequest.findMany({
      where: { organizationId: organization.id },
      include: {
        clientService: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const serviceOptions: HelpRequestServiceOption[] = clientServices.map(
    (cs) => ({
      clientServiceId: cs.id,
      name: cs.name,
      serviceName: cs.service.name,
    })
  );

  const historyItems: HelpRequestDTO[] = helpRequests.map((r) => ({
    id: r.id,
    subject: r.subject,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    service: r.clientService
      ? { clientServiceId: r.clientService.id, name: r.clientService.name }
      : null,
    messages: toHelpRequestMessageDTOs(r.messages),
  }));

  return (
    <PageShell size="wide">
      <PageHeader
        title="Aide"
        description="Une question sur une solution, un souci technique ? L'équipe vous répond ici."
      />

      {historyItems.length > 0 && <HelpRequestHistory items={historyItems} />}

      <section aria-labelledby="new-request-heading" className="mt-10">
        <h2 id="new-request-heading" className="mb-4 text-lg font-semibold text-foreground">
          Nouvelle demande
        </h2>
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:gap-12">
          <HelpRequestForm services={serviceOptions} />
          <HowItWorks />
        </div>
      </section>
    </PageShell>
  );
}
