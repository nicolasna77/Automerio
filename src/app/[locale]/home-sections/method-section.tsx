import { getTranslations } from "next-intl/server";
import { ProductScreenshot } from "@/components/product-screenshot";
import { cn } from "@/lib/utils";
import { BriefIllustration, SetupIllustration } from "./method-illustrations";

// Deux colonnes plutôt qu'un zigzag de quatre rangées : ce qui revient au
// client, puis ce que fait l'équipe. Les numéros d'étape gardent l'ordre.
const COLUMNS = [
  {
    key: "you",
    steps: [
      { step: "01", key: "choose" },
      { step: "02", key: "brief" },
    ],
    illustration: <BriefIllustration />,
  },
  {
    key: "us",
    steps: [
      { step: "03", key: "setup" },
      { step: "04", key: "follow" },
    ],
    illustration: <SetupIllustration />,
  },
] as const;

// Colonne de gauche : les échanges avec les clients, au téléphone et par
// message ; à droite, le calendrier et les réglages.
const LEFT_SHOTS = [
  { key: "calls", name: "dashboard-calls", width: 632, height: 650, alt: "callsAlt", url: "automerio.com/dashboard/services" },
  { key: "conversations", name: "dashboard-conversations", width: 632, height: 762, alt: "conversationsAlt", url: "automerio.com/dashboard/services" },
] as const;

const SHOTS = [
  { key: "calendar", name: "dashboard-calendar", width: 768, height: 576, alt: "calendarAlt", url: "automerio.com/dashboard/calendar" },
  { key: "settings", name: "dashboard-settings", width: 1024, height: 640, alt: "settingsAlt", url: "automerio.com/dashboard/services" },
] as const;

export async function MethodSection() {
  const [t, tShots] = await Promise.all([getTranslations("Home.method"), getTranslations("Screenshots")]);
  return (
    <section id="method" aria-labelledby="method-heading" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-sm font-medium text-muted-foreground">{t("eyebrow")}</span>
          <h2
            id="method-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-10">
          {COLUMNS.map((column) => {
            const ours = column.key === "us";
            return (
              <div
                key={column.key}
                className={cn("flex flex-col border-t pt-6", ours ? "border-primary" : "border-border")}
              >
                <h3 className={cn("text-sm font-medium", ours ? "text-primary" : "text-muted-foreground")}>
                  {t(`columns.${column.key}`)}
                </h3>
                <ol className="mt-6 space-y-8">
                  {column.steps.map((step) => (
                    <li key={step.key} className="flex gap-4">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-medium",
                          ours ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"
                        )}
                      >
                        {step.step}
                      </span>
                      <div>
                        <p className="text-sm text-muted-foreground">{t(`steps.${step.key}.who`)}</p>
                        <h4 className="mt-1 text-xl font-semibold tracking-tight text-balance text-foreground">
                          {t(`steps.${step.key}.title`)}
                        </h4>
                        <p className="mt-2 leading-relaxed text-muted-foreground">
                          {t(`steps.${step.key}.description`)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-auto pt-10">{column.illustration}</div>
              </div>
            );
          })}
        </div>

        {/* Le suivi (étape 04) : appels et conversations à gauche, calendrier
            et réglages à droite. */}
        <div className="mt-20 sm:mt-28">
          <div className="max-w-2xl">
            <h3 className="text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-3xl">
              {t("dashboard.heading")}
            </h3>
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{t("dashboard.lead")}</p>
          </div>
          <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-8">
            <ul className="grid min-w-0 content-start gap-10 lg:gap-8">
              {LEFT_SHOTS.map((shot) => (
                <li key={shot.key} className="min-w-0">
                  <h4 className="text-lg font-semibold tracking-tight text-foreground">
                    {t(`dashboard.items.${shot.key}.title`)}
                  </h4>
                  <p className="mt-1.5 mb-5 leading-relaxed text-muted-foreground">
                    {t(`dashboard.items.${shot.key}.description`)}
                  </p>
                  <ProductScreenshot
                    name={shot.name}
                    width={shot.width}
                    height={shot.height}
                    alt={tShots(shot.alt)}
                    caption={tShots("demoCaption")}
                    sizes="(min-width: 1152px) 548px, 100vw"
                    windowUrl={shot.url}
                  />
                </li>
              ))}
            </ul>
            <ul className="grid min-w-0 content-start gap-10 lg:gap-8">
              {SHOTS.map((shot) => (
                <li key={shot.key} className="min-w-0">
                  <h4 className="text-lg font-semibold tracking-tight text-foreground">
                    {t(`dashboard.items.${shot.key}.title`)}
                  </h4>
                  <p className="mt-1.5 mb-5 leading-relaxed text-muted-foreground">
                    {t(`dashboard.items.${shot.key}.description`)}
                  </p>
                  <ProductScreenshot
                    name={shot.name}
                    width={shot.width}
                    height={shot.height}
                    alt={tShots(shot.alt)}
                    caption={tShots("demoCaption")}
                    sizes="(min-width: 1152px) 548px, 100vw"
                    windowUrl={shot.url}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
