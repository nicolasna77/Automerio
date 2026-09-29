import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export async function CtaSection() {
  const t = await getTranslations("Home.cta");
  return (
    <section aria-labelledby="cta-heading" className="px-4 pb-20 sm:px-6 sm:pb-24">
      <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-lg border border-border bg-card px-6 py-16 text-center sm:py-20">
        <h2
          id="cta-heading"
          className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
        >
          {t("heading")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          {t("lead")}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            {t("signup")}
            <ArrowRight data-icon="inline-end" />
          </Link>
          <Link href="/contact" className={buttonVariants({ size: "lg", variant: "outline" })}>
            {t("ask")}
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t("note")}</p>
      </div>
    </section>
  );
}
