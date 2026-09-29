import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { ServiceDTO } from "@/lib/catalog";
import { formatCentsWithVat } from "@/lib/vat";
import { ProductScreenshot } from "@/components/product-screenshot";

export async function HeroSection({ services }: { services: ServiceDTO[] }) {
  const [t, tShots] = await Promise.all([getTranslations("Home.hero"), getTranslations("Screenshots")]);
  const communication = services.filter((s) => s.category === "COMMUNICATION");

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
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-balance text-foreground sm:text-5xl">
            {t("title")}
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
              className={buttonVariants({ size: "lg", variant: "outline" })}
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
        <ProductScreenshot
          name="dashboard-overview"
          width={1024}
          height={640}
          alt={tShots("overviewAlt")}
          caption={tShots("demoCaption")}
          sizes="(min-width: 1024px) 640px, 100vw"
          priority
        />
      </div>
    </section>
  );
}
