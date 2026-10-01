import { getTranslations } from "next-intl/server";
import { ArrowRight, Building2, ChevronRight, Hammer, Scissors, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTrade, tradePath } from "@/lib/trades";

const AUDIENCES = [
  { key: "artisan", icon: Hammer, trade: "artisans" },
  { key: "beauty", icon: Scissors, trade: "coiffure-beaute" },
  { key: "coach", icon: Users, trade: "coachs" },
  { key: "tpe", icon: Building2, trade: "cabinets" },
] as const;

export async function AudienceSection() {
  const t = await getTranslations("Home.audience");
  return (
    <section id="pour-qui" aria-labelledby="audience-heading" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-medium text-muted-foreground">{t("eyebrow")}</span>
          <h2
            id="audience-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map(({ key, icon: Icon, trade }) => (
            <li key={key} className="flex flex-col rounded-lg border border-border bg-card p-6">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="size-4 text-primary" aria-hidden="true" />
                {t(`items.${key}.who`)}
              </h3>
              <p className="mt-4 text-lg leading-snug font-medium text-balance text-foreground">
                « {t(`items.${key}.quote`)} »
              </p>
              <p className="mt-auto flex items-start gap-2 pt-5 text-sm leading-relaxed text-muted-foreground">
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {t(`items.${key}.answer`)}
              </p>
              <Link
                href={tradePath(trade)}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("seePage", { name: getTrade(trade)?.name.toLowerCase() ?? "" })}
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
