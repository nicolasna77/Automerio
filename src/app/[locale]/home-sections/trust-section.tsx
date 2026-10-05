import { getTranslations } from "next-intl/server";
import { ArrowRight, Download, MessageSquareText, ServerCog, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Damier 2 + 1 puis 1 + 2 : les deux engagements les plus forts (rien n'est
// revendu, vous gardez la main) prennent les cases larges, teintées.
const TRUST_ITEMS = [
  { key: "noResale", icon: ShieldCheck, wide: true },
  { key: "informed", icon: MessageSquareText, wide: false },
  { key: "providers", icon: ServerCog, wide: false },
  { key: "control", icon: Download, wide: true },
] as const;

export async function TrustSection() {
  const t = await getTranslations("Home.trust");
  return (
    <section aria-labelledby="trust-heading" className="border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2
            id="trust-heading"
            className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
        </div>
        <ul className="mt-12 grid gap-4 lg:grid-cols-3">
          {TRUST_ITEMS.map(({ key, icon: Icon, wide }) => (
            <li
              key={key}
              className={cn(
                "rounded-lg border p-6 sm:p-8",
                wide ? "border-primary/30 bg-primary/5 lg:col-span-2" : "border-border bg-card"
              )}
            >
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <h3
                className={cn(
                  "mt-4 font-semibold tracking-tight text-foreground",
                  wide ? "text-xl sm:text-2xl" : "text-base"
                )}
              >
                {t(`items.${key}.title`)}
              </h3>
              <p className={cn("mt-2 max-w-prose leading-relaxed text-muted-foreground", !wide && "text-sm")}>
                {t(`items.${key}.description`)}
              </p>
            </li>
          ))}
        </ul>
        <Link
          href="/privacy"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:focus-ring"
        >
          {t("privacy")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
