import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

export async function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  const t = await getTranslations("Legal");
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="content" className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("lastUpdated", { date: LEGAL_LAST_UPDATED })}
          </p>
          {intro && (
            <div className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {intro}
            </div>
          )}
          <div className="mt-12 space-y-10">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-8">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-4 max-w-2xl space-y-3 leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export function LegalFacts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-[12rem_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
