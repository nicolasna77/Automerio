import { cn } from "@/lib/utils";
import {
  BriefIllustration,
  ChooseIllustration,
  FollowIllustration,
  SetupIllustration,
} from "./method-illustrations";

const METHOD_STEPS = [
  {
    step: "01",
    who: "Vous · 2 minutes",
    title: "Vous choisissez ce qui vous fait perdre du temps",
    description:
      "Les appels manqués, les rendez-vous à caler, les e-mails qui s'accumulent : chaque solution a son prix affiché. Pas de devis, pas de rendez-vous commercial, un abonnement mensuel sans engagement.",
    illustration: <ChooseIllustration />,
  },
  {
    step: "02",
    who: "Vous · 5 minutes",
    title: "Vous nous dites comment vous travaillez",
    description:
      "Votre activité, vos horaires, ce qu'il faut faire en cas d'urgence. Quelques champs à remplir depuis votre téléphone, rien à installer ni à paramétrer.",
    illustration: <BriefIllustration />,
  },
  {
    step: "03",
    who: "Nous · quelques jours",
    title: "Nous installons, nous testons, nous activons",
    description:
      "Notre équipe connecte la solution à vos outils existants et la teste sur vos cas réels. Vous recevez un e-mail le jour où elle est active.",
    illustration: <SetupIllustration />,
  },
  {
    step: "04",
    who: "Nous · chaque mois",
    title: "Nous surveillons et nous ajustons",
    description:
      "Vous suivez son activité dans votre tableau de bord. Quand votre activité change, nous adaptons les réglages. C'est compris dans l'abonnement.",
    illustration: <FollowIllustration />,
  },
];

export function MethodSection() {
  return (
    <section id="method" aria-labelledby="method-heading" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Notre méthode</span>
          <h2
            id="method-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            Vous décidez, nous faisons le reste
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Quatre étapes, dont deux seulement vous demandent quelque chose. Aucune ne vous demande de
            compétence technique.
          </p>
        </div>

        <ol className="mt-16 space-y-16 sm:space-y-24">
          {METHOD_STEPS.map((step, index) => (
            <li key={step.step} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
              <div className={cn("max-w-lg", index % 2 === 1 && "lg:order-2")}>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full font-mono text-sm",
                      index >= 2 ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"
                    )}
                  >
                    {step.step}
                  </span>
                  <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">{step.who}</span>
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-balance text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">{step.description}</p>
              </div>
              <div className={cn(index % 2 === 1 && "lg:order-1")}>{step.illustration}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
