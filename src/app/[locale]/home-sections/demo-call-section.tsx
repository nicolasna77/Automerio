import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { isDemoCallAvailable } from "@/lib/demo-call";
import { DemoCallForm } from "../services/[slug]/demo-call-form";

const POINTS = ["free", "noAccount", "short"] as const;

// L'essai d'appel est la seule preuve qu'un visiteur peut juger sans créer de
// compte : il figure sur l'accueil, et plus seulement sur les pages des
// solutions téléphoniques. Masqué si la téléphonie n'est pas configurée.
export async function DemoCallSection() {
  if (!isDemoCallAvailable()) return null;
  const t = await getTranslations("Home.demo");
  return (
    <section id="essai" aria-labelledby="demo-heading" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2
            id="demo-heading"
            className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
          <ul className="mt-6 space-y-2">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2 text-foreground">
                <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                {t(`points.${point}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <DemoCallForm serviceSlug="standard-telephonique-ia" />
        </div>
      </div>
    </section>
  );
}
