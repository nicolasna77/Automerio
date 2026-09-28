import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { ServiceDTO } from "@/lib/catalog";
import { formatCentsWithVat } from "@/lib/vat";
import { HeroNetworkVisual } from "./hero-network-visual";

const VISUAL_NODE_COUNT = 6;

export async function HeroSection({ services }: { services: ServiceDTO[] }) {
  const t = await getTranslations("Home.hero");
  const communication = services.filter((s) => s.category === "COMMUNICATION");
  const labels = communication.slice(0, VISUAL_NODE_COUNT).map((s) => s.name);

  const monthlyPrices = communication
    .filter((s) => s.monthlyPriceCents !== null)
    .map((s) => s.monthlyPriceCents as number);
  const fromPrice =
    monthlyPrices.length > 0 ? Math.min(...monthlyPrices) : null;

  const facts = [
    fromPrice !== null ? t("fromPrice", { price: formatCentsWithVat(fromPrice) }) : null,
    t("noCommitment"),
    t("refund"),
  ].filter((fact): fact is string => fact !== null);

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 overflow-hidden"
      >
        <div className="absolute top-[12%] -left-1/2 w-[150%] origin-center rotate-[-38deg]">
          <div className="h-24 bg-primary/8 dark:bg-primary/25" />
          <div className="mt-10 h-9 bg-primary/5 dark:bg-primary/15" />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[url(/dot-grid.svg)] bg-size-[1440px_1056px] bg-top opacity-60 mask-[linear-gradient(to_bottom,transparent_58%,black_80%)] lg:mask-[linear-gradient(to_right,transparent_30%,black_65%)] dark:opacity-70 dark:invert"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1fr)_32rem]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            {t("eyebrow")}
          </p>
          <h1 className="mt-6 max-w-2xl tracking-tight text-balance text-foreground">
            <span className="block text-2xl font-medium leading-snug sm:text-3xl">
              {t("titleLead")}
            </span>
            <span className="mt-2 block text-[2.6rem] font-bold leading-[0.98] tracking-[-0.03em] font-stretch-88% sm:text-5xl lg:text-[3.4rem]">
              {t("titleMain")}
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {t("lead")}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              {t("signup")}
              <ArrowRight data-icon="inline-end" />
            </Link>
            <Link
              href="#services"
              className={buttonVariants({ size: "lg", variant: "secondary" })}
            >
              {t("seeServices")}
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {facts.map((fact) => (
              <li
                key={fact}
                className="after:ml-3 after:text-border after:content-['·'] last:after:content-none"
              >
                {fact}
              </li>
            ))}
          </ul>
        </div>
        <HeroNetworkVisual labels={labels} centerLabel={t("yourBusiness")} />
      </div>
    </section>
  );
}
