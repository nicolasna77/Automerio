import { getTranslations } from "next-intl/server";
import { CalendarCheck, MessageSquare, PhoneIncoming } from "lucide-react";

const OUTCOMES = [
  { key: "calls", icon: PhoneIncoming },
  { key: "bookings", icon: CalendarCheck },
  { key: "messages", icon: MessageSquare },
] as const;

export async function OutcomesSection() {
  const t = await getTranslations("Home.outcomes");
  return (
    <section id="solutions" aria-labelledby="outcomes-heading" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-medium text-muted-foreground">{t("eyebrow")}</span>
          <h2
            id="outcomes-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
        </div>
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {OUTCOMES.map(({ key, icon: Icon }) => (
            <li key={key} className="flex flex-col rounded-lg border border-border bg-card p-6">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{t(`items.${key}.description`)}</p>
              <p className="mt-auto pt-5 text-sm text-muted-foreground">
                <span className="block border-t border-border pt-4">
                  {t("channelsLabel")} <span className="text-foreground">{t(`items.${key}.channels`)}</span>
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
