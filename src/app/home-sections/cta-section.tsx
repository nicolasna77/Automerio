import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section aria-labelledby="cta-heading" className="px-4 pb-20 sm:px-6 sm:pb-24">
      <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-16 text-center sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_70%_at_50%_120%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent)]"
        />
        <h2
          id="cta-heading"
          className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
        >
          Prêt à reprendre ces heures perdues chaque semaine ?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Créez votre compte, choisissez vos automatisations et laissez notre équipe s&apos;occuper
          de l&apos;installation.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Créer mon compte
            <ArrowRight data-icon="inline-end" />
          </Link>
          <Link href="/contact" className={buttonVariants({ size: "lg", variant: "outline" })}>
            Poser une question
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Abonnement remboursé 30 jours, sans engagement.</p>
      </div>
    </section>
  );
}
