import { getTranslations } from "next-intl/server";
import { CalendarDays, PhoneForwarded } from "lucide-react";
import { ServiceGlyph } from "@/components/service-glyph";

// Les canaux Meta gardent leur logo officiel (public/brands/README.md) ; les
// autres, qui regroupent plusieurs produits, une icône du jeu lucide.
const INTEGRATIONS = [
  { key: "phone", icon: PhoneForwarded },
  { key: "calendar", icon: CalendarDays },
  { key: "whatsapp", brand: "assistant-whatsapp" },
  { key: "messenger", brand: "assistant-facebook" },
  { key: "instagram", brand: "assistant-instagram" },
] as const;

export async function IntegrationsSection() {
  const t = await getTranslations("Home.integrations");
  return (
    <section aria-labelledby="integrations-heading" className="border-t border-border bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-5 lg:gap-16">
        <div className="lg:col-span-2">
          <h2
            id="integrations-heading"
            className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
        </div>
        <ul className="divide-y divide-border lg:col-span-3">
          {INTEGRATIONS.map((item) => (
            <li key={item.key} className="flex gap-4 py-5 first:pt-0 last:pb-0">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                {"brand" in item ? (
                  <ServiceGlyph slug={item.brand} className="size-6" />
                ) : (
                  <item.icon className="size-5 text-primary" aria-hidden="true" />
                )}
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">{t(`items.${item.key}.title`)}</h3>
                <p className="mt-1 leading-relaxed text-muted-foreground">{t(`items.${item.key}.description`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
