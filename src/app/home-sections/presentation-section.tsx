import { ConfigPreview, SetupPreview } from "@/components/service-illustrations";

const SIDES = [
  {
    label: "Vous",
    title: "Ce que vous faites",
    description:
      "Vous choisissez une solution, vous répondez à quelques questions sur votre activité, et vous suivez le tout depuis un tableau de bord. Rien à installer, rien à paramétrer.",
    preview: <ConfigPreview labels={["Votre activité", "Vos horaires"]} />,
  },
  {
    label: "Nous",
    title: "Ce qu'on fait",
    description:
      "On installe l'automatisation, on la connecte à vos outils, on la teste, puis on la surveille et on l'ajuste chaque mois.",
    preview: <SetupPreview />,
  },
];

export function PresentationSection() {
  return (
    <section aria-labelledby="agence-heading" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="agence-heading"
            className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            Une agence, pas un logiciel à configurer
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Automerio installe des automatisations pour les artisans, coachs, indépendants et
            TPE/PME. Chaque solution est connectée à vos outils existants puis vérifiée par notre
            équipe avant d&apos;être activée chez vous.
          </p>
        </div>
        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {SIDES.map((side) => (
            <li key={side.label} className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card">
              <div className="p-6 sm:p-8">
                <span className="inline-flex rounded-full bg-muted px-2.5 py-1 font-mono text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
                  {side.label}
                </span>
                <h3 className="mt-4 font-sans text-xl font-semibold text-foreground">{side.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{side.description}</p>
              </div>
              <div className="mt-auto border-t border-border bg-muted/40 p-6 sm:p-8">{side.preview}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
