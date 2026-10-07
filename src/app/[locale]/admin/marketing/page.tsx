import { getTranslations } from "next-intl/server";
import { titleMetadata } from "@/i18n/metadata";
import type { MarketingPostStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { GeneratePanel } from "./generate-panel";
import { PostCard } from "./post-card";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("adminMarketing");

const SECTIONS: MarketingPostStatus[] = ["DRAFT", "APPROVED", "PUBLISHED", "REJECTED"];

export default async function AdminMarketingPage() {
  await requireAdmin();
  const t = await getTranslations("Admin.marketing");

  const posts = await db.marketingPost.findMany({
    orderBy: { createdAt: "desc" },
    include: { service: { select: { name: true } } },
  });

  return (
    <PageShell size="content">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <div>
        <GeneratePanel />
      </div>

      {SECTIONS.map((status) => {
        const inSection = posts.filter((post) => post.status === status);
        return (
          <section key={status} className="mt-12" aria-labelledby={`s-${status}`}>
            <div className="flex items-baseline justify-between gap-4">
              <h2
                id={`s-${status}`}
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                {t(`sections.${status}.title`)}
              </h2>
              <span className="text-sm tabular-nums text-muted-foreground">
                {inSection.length}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t(`sections.${status}.description`)}</p>

            {inSection.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                {t(`sections.${status}.empty`)}
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {inSection.map((post) => (
                  <li key={post.id}>
                    <PostCard
                      post={{
                        id: post.id,
                        channel: post.channel,
                        status: post.status,
                        angle: post.angle,
                        body: post.body,
                        imageBrief: post.imageBrief,
                        warnings: post.warnings,
                        serviceName: post.service?.name ?? null,
                        publishedAt: post.publishedAt,
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </PageShell>
  );
}
