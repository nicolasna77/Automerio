import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
          Prêt à reprendre ces heures perdues chaque semaine ?
        </h2>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Créez votre compte, choisissez vos automatisations et laissez notre
          équipe s&apos;occuper de l&apos;installation.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Créer mon compte
            <ArrowRight data-icon="inline-end" />
          </Link>
          <Link
            href="/contact"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Parler à un conseiller
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Abonnement remboursé 30 jours, sans engagement.
        </p>
      </div>
    </section>
  );
}
