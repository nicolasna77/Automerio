import { useTranslations } from "next-intl";

const STEPS = ["describe", "answer", "confirm"] as const;

export function HowItWorks() {
  const t = useTranslations("Dashboard.help.howItWorks");
  return (
    <aside aria-labelledby="help-process-heading" className="lg:sticky lg:top-8 lg:self-start">
      <h2
        id="help-process-heading"
        className="text-sm font-semibold text-foreground"
      >
        {t("title")}
      </h2>
      <ol className="mt-4 space-y-6">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-3">
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
                {t(`steps.${step}.title`)}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t(`steps.${step}.description`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
