import { getMessages, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BeforeAfterTabs, type BeforeAfterCase } from "./before-after-tabs";

// Trois demandes, une par canal : l'appel reste le cas affiché par défaut,
// les messages et les réservations sont à un onglet.
const CASES = [
  { key: "call", before: ["contact", "busy", "later", "lost"], after: ["contact", "answer", "understand", "act", "summary"] },
  { key: "message", before: ["contact", "busy", "later", "lost"], after: ["contact", "answer", "inform", "takeOver"] },
  { key: "booking", before: ["contact", "busy", "later", "lost"], after: ["contact", "answer", "slots", "agenda"] },
] as const;

export async function BeforeAfterSection() {
  const [t, messages] = await Promise.all([getTranslations("Home.beforeAfter"), getMessages()]);
  // Chaque cas a ses propres étapes : on lit le bloc entier, les clés typées
  // une à une ne se combinent pas d'un cas à l'autre.
  const raw = messages.Home.beforeAfter.cases as Record<
    (typeof CASES)[number]["key"],
    { tab: string; before: Record<string, string>; after: Record<string, string> }
  >;
  const cases: BeforeAfterCase[] = CASES.map((item) => ({
    key: item.key,
    tab: raw[item.key].tab,
    before: item.before.map((step) => raw[item.key].before[step]),
    after: item.after.map((step) => raw[item.key].after[step]),
  }));

  return (
    <section aria-labelledby="before-after-heading" className="border-b border-border bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="before-after-heading"
            className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
        </div>

        <BeforeAfterTabs
          cases={cases}
          label={t("tabsLabel")}
          beforeTitle={t("before")}
          afterTitle={t("after")}
        />

        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-medium text-balance text-foreground">{t("result")}</p>
          <a href="#services" className={buttonVariants({ size: "lg" })}>
            {t("seeServices")}
            <ArrowRight data-icon="inline-end" />
          </a>
        </div>
      </div>
    </section>
  );
}
