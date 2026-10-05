import { getTranslations } from "next-intl/server";
import { ArrowRight, Check, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const BEFORE_STEPS = ["call", "busy", "later", "lost"] as const;
const AFTER_STEPS = ["call", "answer", "understand", "act", "summary"] as const;

export async function BeforeAfterSection() {
  const t = await getTranslations("Home.beforeAfter");
  return (
    <section aria-labelledby="before-after-heading" className="border-b border-border bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="before-after-heading"
            className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-6 sm:p-8">
            <h3 className="text-base font-semibold text-muted-foreground">{t("before.title")}</h3>
            <ol className="mt-6 space-y-4">
              {BEFORE_STEPS.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
                  >
                    {index === BEFORE_STEPS.length - 1 ? (
                      <X className="size-3.5 text-destructive" />
                    ) : (
                      <span className="font-mono text-xs">{index + 1}</span>
                    )}
                  </span>
                  <span
                    className={
                      index === BEFORE_STEPS.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"
                    }
                  >
                    {t(`before.steps.${step}`)}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg border border-primary/40 bg-card p-6 shadow-sm sm:p-8">
            <h3 className="text-base font-semibold text-primary">{t("after.title")}</h3>
            <ol className="mt-6 space-y-4">
              {AFTER_STEPS.map((step) => (
                <li key={step} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="size-3.5" />
                  </span>
                  <span className="text-foreground">{t(`after.steps.${step}`)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-medium text-balance text-foreground">{t("result")}</p>
          <a href="#services" className={buttonVariants({ size: "lg" })}>
            {t("seeServices")}
            <ArrowRight data-icon="inline-end" />
          </a>
        </div>
      </div>
    </section>
  );
}
