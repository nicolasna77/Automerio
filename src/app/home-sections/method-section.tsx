/**
 * Les cinq etapes decrivent le parcours que l'application fait reellement vivre
 * au client : il choisit au catalogue, renseigne sa configuration, paie, et
 * l'equipe deploie — `PENDING_PAYMENT`, puis `CONFIGURING`, puis `ACTIVE`.
 * Promettre ici un audit ou une formation qui n'existent nulle part dans le
 * produit ferait attendre au visiteur un rendez-vous qui ne viendra pas.
 */
const METHOD_STEPS = [
  {
    step: "01",
    title: "Vous choisissez",
    description:
      "Au catalogue, prix affiché, sans devis ni rendez-vous préalable. Vous voyez ce que chaque solution coûte avant de vous décider.",
  },
  {
    step: "02",
    title: "Vous réglez l'essentiel",
    description:
      "Quelques champs suffisent : vos horaires, votre adresse, ce que vous proposez. Cinq minutes, depuis votre téléphone.",
  },
  {
    step: "03",
    title: "Nous déployons",
    description:
      "Notre équipe installe l'automatisation, la connecte à vos outils existants et la teste sur vos vrais cas.",
  },
  {
    step: "04",
    title: "C'est actif",
    description:
      "En quelques jours, sans que vous ayez ouvert le moindre logiciel technique. Vous recevez un e-mail à la mise en service.",
  },
  {
    step: "05",
    title: "Nous surveillons",
    description:
      "Nous veillons sur vos automatisations et les ajustons au fil du temps. Inclus dans l'abonnement, sans engagement de durée.",
  },
];

export function MethodSection() {
  return (
    <section id="methode" className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            De votre choix à la mise en service
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Vous choisissez et vous payez ; nous faisons le reste. Aucune étape
            ne vous demande de compétence technique, et aucune ne vous fait
            attendre un rendez-vous.
          </p>
        </div>
        <ol className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {METHOD_STEPS.map((step) => (
            <li key={step.step} className="border-t border-border pt-4">
              <span className="text-sm tabular-nums text-muted-foreground">
                {step.step}
              </span>
              <h3 className="mt-2 font-medium text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
