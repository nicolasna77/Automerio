import { getTranslations } from "next-intl/server";
import { titleMetadata } from "@/i18n/metadata";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ServicesTable } from "./services-table";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("adminServices");

export default async function AdminServicesPage() {
  await requireAdmin();
  const t = await getTranslations("Admin.services");
  const services = await db.service.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <PageShell size="wide">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <ServicesTable services={services} />
    </PageShell>
  );
}
