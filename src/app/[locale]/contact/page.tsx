import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CircleHelp, LifeBuoy, PhoneCall, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { siteOpenGraph } from "@/lib/site-metadata";
import { isDemoCallAvailable } from "@/lib/demo-call";
import { ContactForm } from "./contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const [t, tContact] = await Promise.all([getTranslations("PageTitles"), getTranslations("Contact")]);
  return {
    title: t("contact"),
    description: tContact("metaDescription"),
    alternates: { canonical: "/contact" },
    openGraph: await siteOpenGraph({ url: "/contact", title: t("contact") }),
  };
}

const NEXT_STEPS = ["read", "advise", "activate"] as const;

// Page Contact : le formulaire, ce qui se passe ensuite, et les autres
// chemins (écouter l'assistant, la FAQ, l'aide pour un client déjà inscrit).
export default async function ContactPage() {
  const t = await getTranslations("Contact");
  const demoAvailable = isDemoCallAvailable();
  const shortcuts: { key: "demo" | "faq" | "client"; href: string; icon: LucideIcon }[] = [
    ...(demoAvailable ? [{ key: "demo" as const, href: "/#essai", icon: PhoneCall }] : []),
    { key: "faq", href: "/#faq", icon: CircleHelp },
    { key: "client", href: "/dashboard/help", icon: LifeBuoy },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="content" className="flex-1">
        <section className="border-b border-border py-16 sm:py-24">
          <div className="mx-auto max-w-[80rem] px-4 sm:px-6">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
              {t("heading")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">{t("lead")}</p>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto grid max-w-[80rem] items-start gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
            <ContactForm demoAvailable={demoAvailable} />

            <aside className="space-y-10" aria-label={t("asideLabel")}>
              <div>
                <h2 className="text-base font-semibold text-foreground">{t("next")}</h2>
                <ol className="mt-4 space-y-4">
                  {NEXT_STEPS.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-medium text-primary tabular-nums"
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t(`steps.${step}.label`)}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                          {t(`steps.${step}.detail`)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h2 className="text-base font-semibold text-foreground">{t("otherWays")}</h2>
                <ul className="mt-4 space-y-2">
                  {shortcuts.map(({ key, href, icon: Icon }) => (
                    <li key={key}>
                      <Link
                        href={href}
                        className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:focus-ring"
                      >
                        <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                        <span>
                          <span className="block text-sm font-medium text-foreground">
                            {t(`shortcuts.${key}.label`)}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted-foreground">
                            {t(`shortcuts.${key}.detail`)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
