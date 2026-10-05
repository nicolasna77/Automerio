import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTrades, tradePath } from "@/lib/trades";
import { TRADE_ICONS } from "@/lib/trade-icons";
import { cn } from "@/lib/utils";

const AUDIENCES = [
  { key: "artisan", trade: "tradespeople" },
  { key: "beauty", trade: "hair-beauty" },
  { key: "coach", trade: "coaches" },
  { key: "restaurant", trade: "restaurants" },
  { key: "tpe", trade: "professional-services" },
] as const;

export async function AudienceSection() {
  const t = await getTranslations("Home.audience");
  const credits = getTrades()
    .filter((trade) => AUDIENCES.some((audience) => audience.trade === trade.slug))
    .map((trade) => trade.photo.credit);
  return (
    <section id="who-its-for" aria-labelledby="audience-heading" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="audience-heading"
            className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
        </div>
        {/* Trois cartes puis deux plus larges, sans case vide : chaque carte
            mène à la page du métier et en reprend la photo. */}
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {AUDIENCES.map(({ key, trade }, index) => {
            const Icon = TRADE_ICONS[trade];
            const wide = index >= 3;
            return (
              <li
                key={key}
                className={cn(
                  wide ? "lg:col-span-3" : "lg:col-span-2",
                  index === AUDIENCES.length - 1 && "sm:max-lg:col-span-2",
                )}
              >
                <Link
                  href={tradePath(trade)}
                  className="group/audience flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40 focus-visible:focus-ring"
                >
                  {/* Photo décorative : le texte de la carte nomme le lien. */}
                  <Image
                    src={`/industries/${trade}.webp`}
                    width={1200}
                    height={900}
                    alt=""
                    sizes={wide ? "(min-width: 1024px) 548px, (min-width: 640px) 50vw, 100vw" : "(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"}
                    className={cn(
                      "w-full border-b border-border object-cover",
                      wide ? "aspect-[2/1]" : "aspect-[16/9]",
                    )}
                  />
                  <span className="flex flex-1 flex-col p-6 transition-colors group-hover/audience:bg-muted/40">
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
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          {t("photoCredits", { names: credits.join(", ") })}
        </p>
      </div>
    </section>
  );
}
