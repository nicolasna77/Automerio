import type { Metadata } from "next";
import type { MarketingPostStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { GeneratePanel } from "./generate-panel";
import { PostCard } from "./post-card";

export const metadata: Metadata = { title: "Marketing" };

const SECTIONS: {
  status: MarketingPostStatus;
  title: string;
  description: string;
  empty: string;
}[] = [
  {
    status: "DRAFT",
    title: "À relire",
    description: "Propositions de l'agent. Rien ne part sans votre validation.",
    empty: "Aucune proposition en attente. Demandez-en ci-dessus.",
  },
  {
    status: "APPROVED",
    title: "Validées",
    description: "Prêtes à publier. Copiez le texte, puis marquez la publication faite.",
    empty: "Rien de validé pour l'instant.",
  },
  {
    status: "PUBLISHED",
    title: "Publiées",
    description: "L'historique, qui sert aussi à ne pas se répéter.",
    empty: "Rien de publié pour l'instant.",
  },
  {
    status: "REJECTED",
    title: "Écartées",
    description:
      "Conservées volontairement : leur angle continue d'être rappelé à l'agent, qui ne le repropose pas.",
    empty: "Rien d'écarté.",
  },
];

export default async function AdminMarketingPage() {
  await requireAdmin();

  const posts = await db.marketingPost.findMany({
    orderBy: { createdAt: "desc" },
    include: { service: { select: { name: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Marketing
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Les comptes sociaux d&apos;Automerio, pas ceux de vos clients. L&apos;agent
          rédige à partir du catalogue réel — il n&apos;a le droit d&apos;affirmer
          que ce qui s&apos;y trouve.
        </p>
      </div>

      <div className="mt-8">
        <GeneratePanel />
      </div>

      {SECTIONS.map((section) => {
        const inSection = posts.filter((post) => post.status === section.status);
        return (
          <section key={section.status} className="mt-12" aria-labelledby={`s-${section.status}`}>
            <div className="flex items-baseline justify-between gap-4">
              <h2
                id={`s-${section.status}`}
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                {section.title}
              </h2>
              <span className="text-sm tabular-nums text-muted-foreground">
                {inSection.length}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>

            {inSection.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                {section.empty}
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
    </div>
  );
}
