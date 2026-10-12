import { titleMetadata } from "@/i18n/metadata";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FileText } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { getMyService } from "@/app/[locale]/dashboard/get-my-service";
import { formatDate } from "@/lib/catalog";
import { canDraftInstagram, DRAFTS_KEPT, DRAFTS_PER_DAY, type DraftContent } from "@/lib/instagram-drafts/content";
import { PageHeader, PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { DraftComposer } from "./draft-composer";
import { DraftCard, type DraftCardData } from "./draft-card";

export const generateMetadata = titleMetadata("instagramDrafts");

// Brouillons de publications Instagram d'une solution Instagram payée : le
// formulaire de rédaction, puis l'historique des 20 derniers brouillons.
export default async function InstagramDraftsPage({
  params,
}: {
  params: Promise<{ clientServiceId: string }>;
}) {
  const [{ clientServiceId }, session, , t] = await Promise.all([
    params,
    requireUser(),
    requireActiveOrganization(),
    getTranslations("Dashboard.instagramDrafts"),
  ]);
  const item = await getMyService(clientServiceId, session.user.id);
  if (!item || !canDraftInstagram(item)) notFound();

  const rows = await db.instagramDraft.findMany({
    where: { clientServiceId },
    orderBy: { createdAt: "desc" },
    take: DRAFTS_KEPT,
    select: {
      id: true,
      kind: true,
      subject: true,
      content: true,
      warnings: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });
  const drafts: DraftCardData[] = rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    draft: { kind: row.kind, content: row.content } as DraftContent,
    warnings: row.warnings,
    createdOn: formatDate(row.createdAt),
    authorName: row.createdBy?.name ?? null,
  }));

  const detailHref = `/dashboard/services/${item.clientServiceId}`;

  return (
    <PageShell size="content">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb"), href: "/dashboard/services" },
          { label: item.name, href: detailHref },
          { label: t("headerLink") },
        ]}
        title={t("title")}
        description={t("description")}
      />

      <DraftComposer clientServiceId={item.clientServiceId} dailyLimit={DRAFTS_PER_DAY} />

      <section aria-labelledby="drafts-history" className="mt-10">
        <h2 id="drafts-history" className="text-lg font-semibold text-foreground">
          {t("history.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("history.description", { count: DRAFTS_KEPT })}</p>
        <div className="mt-5 space-y-4">
          {drafts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("history.emptyTitle")}
              description={t("history.emptyDescription")}
            />
          ) : (
            drafts.map((draft) => <DraftCard key={draft.id} data={draft} />)
          )}
        </div>
      </section>
    </PageShell>
  );
}
