const STEPS = [
  {
    title: "Décrivez votre demande",
    description:
      "Choisissez la solution concernée si besoin, puis expliquez votre problème ou votre question.",
  },
  {
    title: "L'équipe Automerio répond",
    description: "Nous traitons votre demande sous 24h ouvrées.",
  },
  {
    title: "Recevez la confirmation",
    description: "Un e-mail vous prévient dès que c'est traité.",
  },
];

export function HowItWorks() {
  return (
    <aside aria-labelledby="help-process-heading" className="lg:sticky lg:top-8 lg:self-start">
      <h2
        id="help-process-heading"
        className="text-sm font-semibold text-foreground"
      >
        Comment ça marche
      </h2>
      <ol className="mt-4 space-y-6">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {index + 1}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="mt-1 w-px flex-1 bg-border"
                />
              )}
            </div>
            <div className={index < STEPS.length - 1 ? "pb-1" : undefined}>
              <p className="text-sm font-medium text-foreground">
                {step.title}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
