import { getTranslations } from "next-intl/server";
import { ArrowRight, CalendarClock, MessageSquare, PhoneMissed } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const PROBLEMS = [
  { icon: PhoneMissed, key: "missedCall" },
  { icon: MessageSquare, key: "lateMessage" },
  { icon: CalendarClock, key: "booking" },
] as const;

export async function ProblemSection() {
  const t = await getTranslations("Home.problem");
  return (
    <section aria-labelledby="problem-heading" className="border-y border-border bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="problem-heading"
            className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("lead")}
          </p>
        </div>
        <ul className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {PROBLEMS.map((problem) => (
            <li key={problem.key}>
              <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-destructive">
                <problem.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-sans text-lg font-semibold text-foreground">{t(`items.${problem.key}.title`)}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{t(`items.${problem.key}.description`)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-14 flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-medium text-balance text-foreground">
            {t("conclusion")}
          </p>
          <a href="#services" className={buttonVariants({ size: "lg" })}>
            {t("seeServices")}
            <ArrowRight data-icon="inline-end" />
          </a>
        </div>
      </div>
    </section>
  );
}
