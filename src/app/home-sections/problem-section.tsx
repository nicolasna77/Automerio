import Link from "next/link";
import { ArrowRight, CalendarClock, MessageSquare, PhoneMissed } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const PROBLEMS = [
  {
    icon: PhoneMissed,
    title: "Un appel manqué, un client perdu",
    description:
      "Vous êtes sur un chantier ou avec un client : le téléphone sonne dans le vide, et l'appelant compose le numéro suivant.",
  },
  {
    icon: MessageSquare,
    title: "Un message lu le soir, une vente déjà partie",
    description:
      "Un client vous écrit sur WhatsApp à 14 h. Vous répondez à 21 h : entre-temps, il a réservé chez un autre.",
  },
  {
    icon: CalendarClock,
    title: "Trois minutes par rendez-vous, vingt fois par jour",
    description:
      "Proposer un créneau, noter le nom, vérifier l'agenda : une heure de votre journée part là, et elle ne se facture pas.",
  },
];

export function ProblemSection() {
  return (
    <section aria-labelledby="probleme-heading" className="border-y border-border bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="probleme-heading"
            className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            Chaque tâche répétitive vous coûte du temps que vous ne facturez pas
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Trois situations que vous reconnaîtrez sans doute.
          </p>
        </div>
        <ul className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {PROBLEMS.map((problem) => (
            <li key={problem.title}>
              <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-destructive">
                <problem.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-sans text-lg font-semibold text-foreground">{problem.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{problem.description}</p>
            </li>
          ))}
        </ul>
        <div className="mt-14 flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-medium text-balance text-foreground">
            Ces trois-là, une automatisation s&apos;en charge pendant que vous travaillez.
          </p>
          <Link href="#prestations" className={buttonVariants({ size: "lg" })}>
            Voir les solutions
            <ArrowRight data-icon="inline-end" />
          </Link>
        </div>
      </div>
    </section>
  );
}
