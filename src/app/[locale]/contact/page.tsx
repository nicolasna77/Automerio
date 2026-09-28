import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { siteOpenGraph } from "@/lib/site-metadata";
import { ContactForm } from "./contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageTitles");
  return {
    title: t("contact"),
    alternates: { canonical: "/contact" },
    openGraph: await siteOpenGraph({ url: "/contact", title: t("contact") }),
  };
}

const NEXT_STEPS = ["reply", "call", "quote"] as const;

export default async function ContactPage() {
  const t = await getTranslations("Contact");
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="content" className="flex-1">
        <section className="border-b border-border py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              {t("heading")}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t("lead")}
            </p>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_18rem]">
            <ContactForm />
            <aside>
              <h2 className="text-sm font-medium text-muted-foreground">{t("next")}</h2>
              <ol className="mt-4">
                {NEXT_STEPS.map((step, index) => (
                  <li key={step} className="border-t border-border py-4">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {t(`steps.${step}.label`)}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {t(`steps.${step}.detail`)}
                    </p>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
