import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Phone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { ServiceDTO } from "@/lib/catalog";
import { getPriceFormatter } from "@/lib/price-format-server";
import { ProductScreenshot } from "@/components/product-screenshot";

async function LiveCallCard() {
  const [t, tCall] = await Promise.all([
    getTranslations("Home.hero.live"),
    getTranslations("Illustrations.call"),
  ]);
  const turns = [
    { speaker: t("caller"), text: tCall("leakThem") },
    { speaker: t("assistant"), text: tCall("leakUs") },
  ];
  return (
    <div
      aria-hidden="true"
      className="absolute -bottom-8 -left-8 hidden w-72 rounded-lg border border-border bg-card p-4 shadow-lg lg:block"
    >
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Phone className="size-4 text-primary" />
          {t("title")}
        </p>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">00:42</span>
      </div>
      <dl className="mt-3 space-y-2 border-t border-border pt-3 text-xs leading-snug">
        {turns.map((turn) => (
          <div key={turn.speaker}>
            <dt className="font-mono text-muted-foreground">{turn.speaker}</dt>
            <dd className="mt-0.5 text-foreground">{turn.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export async function HeroSection({ services }: { services: ServiceDTO[] }) {
  const [t, tShots, price] = await Promise.all([
    getTranslations("Home.hero"),
    getTranslations("Screenshots"),
    getPriceFormatter(),
  ]);
  const monthlyPrices = services
    .filter((s) => s.category === "COMMUNICATION" && s.monthlyPriceCents !== null)
    .map((s) => s.monthlyPriceCents as number);
  const fromPrice = monthlyPrices.length > 0 ? Math.min(...monthlyPrices) : null;

  const specs = [
    fromPrice !== null
      ? { label: t("specs.price"), value: t("specs.priceValue", { price: price.perMonthWithVat(fromPrice) }) }
      : null,
    { label: t("specs.commitment"), value: t("specs.commitmentValue") },
    { label: t("specs.guarantee"), value: t("specs.guaranteeValue") },
  ].filter((spec): spec is { label: string; value: string } => spec !== null);

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-balance text-foreground sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              {t("signup")}
              <ArrowRight data-icon="inline-end" />
            </Link>
            <Link href="#services" className={buttonVariants({ size: "lg", variant: "outline" })}>
              {t("seeServices")}
            </Link>
          </div>
          <dl className="mt-8 max-w-md divide-y divide-border border-y border-border text-sm">
            {specs.map((spec) => (
              <div key={spec.label} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground">{spec.label}</dt>
                <dd className="text-right font-mono tabular-nums text-foreground">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative">
          <ProductScreenshot
            name="dashboard-overview"
            width={1024}
            height={640}
            alt={tShots("overviewAlt")}
            caption={tShots("demoCaption")}
            sizes="(min-width: 1024px) 640px, 100vw"
            windowUrl="automerio.com/dashboard"
            captionClassName="lg:text-right"
            priority
          />
          <LiveCallCard />
        </div>
      </div>
    </section>
  );
}
