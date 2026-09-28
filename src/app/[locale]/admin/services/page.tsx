import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ServicesTable } from "./services-table";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Solutions" };

export default async function AdminServicesPage() {
  await requireAdmin();
  const services = await db.service.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <PageShell size="wide">
      <PageHeader
        title="Solutions"
        description="Le catalogue affiché sur le site public et proposé aux clients."
      />

      <ServicesTable services={services} />
    </PageShell>
  );
}
