export function PresentationSection() {
  return (
    <section className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
            Une agence, pas un logiciel à configurer
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground">
            Automerio installe des automatisations pour les artisans, coachs,
            indépendants et TPE/PME. Chaque solution est connectée à vos outils
            existants puis vérifiée par notre équipe avant d&apos;être activée
            chez vous.
          </p>
        </div>
        <dl className="space-y-6 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <div>
            <dt className="font-medium text-foreground">Ce que vous faites</dt>
            <dd className="mt-1 text-sm leading-relaxed text-foreground">
              Vous choisissez une solution, vous répondez à quelques questions
              sur votre activité, et vous suivez le tout depuis un tableau de
              bord. Rien à installer, rien à paramétrer.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Ce qu&apos;on fait</dt>
            <dd className="mt-1 text-sm leading-relaxed text-foreground">
              On installe l&apos;automatisation, on la connecte à vos outils,
              on la teste, puis on la surveille et on l&apos;ajuste chaque
              mois.
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
