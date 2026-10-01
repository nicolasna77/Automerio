import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Check, ChevronRight, Phone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { ServiceDTO } from "@/lib/catalog";
import { getPriceFormatter } from "@/lib/price-format-server";
import { ProductScreenshot } from "@/components/product-screenshot";
import { isWaitlistMode } from "@/lib/launch-mode";

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
      className="absolute right-0 bottom-24 hidden w-72 rounded-lg border border-border bg-card p-4 shadow-lg lg:block xl:-right-6"
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

// Trame de fond du hero : lignes fines et un point à chaque croisement,
// estompée vers les bords (seule trame autorisée, DESIGN.md, Couleurs).
function HeroGrid() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_40%,transparent_100%)]"
      style={{
        backgroundImage: [
          "radial-gradient(circle, var(--border) 1.5px, transparent 1.6px)",
          "linear-gradient(to right, var(--border) 1px, transparent 1px)",
          "linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "6rem 6rem",
        backgroundPosition: "-0.5px -0.5px, -0.5px 0, 0 -0.5px",
      }}
    />
  );
}

export async function HeroSection({ services }: { services: ServiceDTO[] }) {
  const waitlist = isWaitlistMode();
  const [t, tShots, tWaitlist, price] = await Promise.all([
    getTranslations("Home.hero"),
    getTranslations("Screenshots"),
    getTranslations("Waitlist"),
    getPriceFormatter(),
  ]);
  const monthlyPrices = services
    .filter((s) => s.category === "COMMUNICATION" && s.monthlyPriceCents !== null)
    .map((s) => s.monthlyPriceCents as number);
  const fromPrice = monthlyPrices.length > 0 ? Math.min(...monthlyPrices) : null;

  const specs = [
    t("specs.install"),
    t("specs.commitment"),
    fromPrice !== null ? t("specs.from", { price: price.perMonthWithVat(fromPrice) }) : null,
  ].filter((spec): spec is string => spec !== null);

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      <HeroGrid />
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24 sm:pb-16">
        <Link
          href={waitlist ? "#waitlist" : "#services"}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:focus-ring focus-visible:outline-none"
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
          {waitlist ? t("badgeWaitlist") : t("badge")}
          <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </Link>

        <h1 className="mx-auto mt-8 max-w-4xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-foreground sm:text-6xl lg:text-7xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
          {t("lead")}
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
          <Link href={waitlist ? "#waitlist" : "/signup"} className={buttonVariants({ size: "lg" })}>
            {waitlist ? tWaitlist("cta") : t("signup")}
            <ArrowRight data-icon="inline-end" />
          </Link>
          <Link
            href="#method"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:focus-ring focus-visible:outline-none"
          >
            {t("howItWorks")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {specs.map((spec) => (
            <li key={spec} className="flex items-center gap-1.5">
              <Check className="size-4 text-primary" aria-hidden="true" />
              {spec}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <ProductScreenshot
          name="dashboard-overview"
          width={1024}
          height={640}
          alt={tShots("overviewAlt")}
          caption={tShots("demoCaption")}
          sizes="(min-width: 1152px) 1104px, 100vw"
          windowUrl="automerio.com/dashboard"
          captionClassName="text-center"
          showcase
          priority
        />
        <LiveCallCard />
      </div>
    </section>
  );
}
