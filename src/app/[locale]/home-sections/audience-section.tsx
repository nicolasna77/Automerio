import { getTranslations } from "next-intl/server";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { tradePath } from "@/lib/trades";
import { TRADE_ICONS } from "@/lib/trade-icons";

const AUDIENCES = [
  { key: "artisan", trade: "tradespeople" },
  { key: "beauty", trade: "hair-beauty" },
  { key: "coach", trade: "coaches" },
  { key: "restaurant", trade: "restaurants" },
  { key: "tpe", trade: "professional-services" },
] as const;

export async function AudienceSection() {
  const t = await getTranslations("Home.audience");
  return (
    <section id="who-its-for" aria-labelledby="audience-heading" className="scroll-mt-20 py-20 sm:py-24">
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
        {/* Trois cartes puis deux, centrées : chaque carte mène à la page du métier. */}
        <ul className="mt-12 flex flex-wrap justify-center gap-4">
          {AUDIENCES.map(({ key, trade }) => {
            const Icon = TRADE_ICONS[trade];
            return (
              <li key={key} className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc((100%-2rem)/3)]">
                <Link
                  href={tradePath(trade)}
                  className="flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:focus-ring focus-visible:outline-none"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    {t(`items.${key}.who`)}
                  </span>
                  <span className="mt-4 text-lg leading-snug font-medium text-balance text-foreground">
                    « {t(`items.${key}.quote`)} »
                  </span>
                  <span className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                    <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    {t(`items.${key}.answer`)}
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-medium text-primary">
                    {t("seePage")}
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
