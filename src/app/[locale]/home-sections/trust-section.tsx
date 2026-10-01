import { getTranslations } from "next-intl/server";
import { ArrowRight, Download, MessageSquareText, ServerCog, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";

const TRUST_ITEMS = [
  { key: "informed", icon: MessageSquareText },
  { key: "providers", icon: ServerCog },
  { key: "noResale", icon: ShieldCheck },
  { key: "control", icon: Download },
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
        <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map(({ key, icon: Icon }) => (
            <li key={key} className="bg-card p-6">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold text-foreground">{t(`items.${key}.title`)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`items.${key}.description`)}</p>
            </li>
          ))}
        </ul>
        <Link
          href="/privacy"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:focus-ring focus-visible:outline-none"
        >
          {t("privacy")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
