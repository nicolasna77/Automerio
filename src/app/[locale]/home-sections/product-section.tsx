import { getTranslations } from "next-intl/server";
import { ProductScreenshot } from "@/components/product-screenshot";

const SHOTS = [
  { key: "calendar", name: "dashboard-calendar", alt: "calendarAlt", url: "automerio.com/dashboard/calendar" },
  { key: "settings", name: "dashboard-settings", alt: "settingsAlt", url: "automerio.com/dashboard/services" },
] as const;

export async function ProductSection() {
  const [t, tShots] = await Promise.all([getTranslations("Home.product"), getTranslations("Screenshots")]);
  return (
    <section aria-labelledby="product-heading" className="border-t border-border bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-medium text-muted-foreground">{t("eyebrow")}</span>
          <h2
            id="product-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
        </div>
        <ul className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-8">
          {SHOTS.map((shot) => (
            <li key={shot.key}>
              <h3 className="text-xl font-semibold tracking-tight text-foreground">{t(`items.${shot.key}.title`)}</h3>
              <p className="mt-2 mb-5 leading-relaxed text-muted-foreground">{t(`items.${shot.key}.description`)}</p>
              <ProductScreenshot
                name={shot.name}
                width={1024}
                height={640}
                alt={tShots(shot.alt)}
                caption={tShots("demoCaption")}
                sizes="(min-width: 1024px) 540px, 100vw"
                windowUrl={shot.url}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
