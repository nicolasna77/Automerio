import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { siteOpenGraph } from "@/lib/site";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
  openGraph: siteOpenGraph({ url: "/contact", title: "Contact" }),
};

const NEXT_STEPS = [
  {
    label: "Réponse sous 24h ouvrées",
    detail: "Un premier retour rapide sur votre message.",
  },
  {
    label: "Échange de 15 minutes",
    detail: "Sans engagement, pour comprendre vos besoins.",
  },
  {
    label: "Devis personnalisé",
    detail: "Adapté à votre activité, sous 48h.",
  },
];

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="contenu" className="flex-1">
        <section className="border-b border-border py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Parlons de votre activité
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Décrivez-nous ce qui vous prend le plus de temps aujourd&apos;hui
              — nous vous recommandons les automatisations les plus utiles
              pour votre métier.
            </p>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_18rem]">
            <ContactForm />
            <aside>
              <h2 className="text-sm font-medium text-muted-foreground">Ensuite</h2>
              <ol className="mt-4">
                {NEXT_STEPS.map((step, index) => (
                  <li key={step.label} className="border-t border-border py-4">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {step.detail}
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
