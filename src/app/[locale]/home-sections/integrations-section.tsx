import { getTranslations } from "next-intl/server";
import { CalendarDays, MessageCircle, MessagesSquare, PhoneForwarded, Send } from "lucide-react";

const INTEGRATIONS = [
  { key: "phone", icon: PhoneForwarded },
  { key: "calendar", icon: CalendarDays },
  { key: "whatsapp", icon: MessageCircle },
  { key: "messenger", icon: MessagesSquare },
  { key: "instagram", icon: Send },
] as const;

export async function IntegrationsSection() {
  const t = await getTranslations("Home.integrations");
  return (
    <section aria-labelledby="integrations-heading" className="border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2
            id="integrations-heading"
            className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
        </div>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
          {INTEGRATIONS.map(({ key, icon: Icon }) => (
            <li key={key} className="bg-card p-6">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold text-foreground">{t(`items.${key}.title`)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t(`items.${key}.description`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
