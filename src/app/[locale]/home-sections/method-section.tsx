import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import {
  BriefIllustration,
  ChooseIllustration,
  FollowIllustration,
  SetupIllustration,
} from "./method-illustrations";

const METHOD_STEPS = [
  { step: "01", key: "choose", illustration: <ChooseIllustration /> },
  { step: "02", key: "brief", illustration: <BriefIllustration /> },
  { step: "03", key: "setup", illustration: <SetupIllustration /> },
  { step: "04", key: "follow", illustration: <FollowIllustration /> },
] as const;

export async function MethodSection() {
  const t = await getTranslations("Home.method");
  return (
    <section id="method" aria-labelledby="method-heading" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-medium text-muted-foreground">{t("eyebrow")}</span>
          <h2
            id="method-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {t("lead")}
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
                      "flex size-10 items-center justify-center rounded-full text-sm font-semibold",
                      index >= 2 ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"
                    )}
                  >
                    {step.step}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">{t(`steps.${step.key}.who`)}</span>
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-balance text-foreground">
                  {t(`steps.${step.key}.title`)}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">{t(`steps.${step.key}.description`)}</p>
              </div>
              <div className={cn(index % 2 === 1 && "lg:order-1")}>{step.illustration}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
