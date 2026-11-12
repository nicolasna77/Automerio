import { getTranslations } from "next-intl/server";
import { CalendarDays, PhoneForwarded, Webhook } from "lucide-react";
import { ServiceGlyph } from "@/components/service-glyph";
import { SectionGlow } from "@/components/section-glow";
import { AutomerioMark } from "@/components/brand";
import { MotionScene } from "@/components/illustration-motion";
import motion from "@/components/illustration-motion.module.css";

// Les canaux Meta gardent leur logo officiel (public/brands/README.md) ; les
// autres, qui regroupent plusieurs produits, une icône du jeu lucide.
const INTEGRATIONS = [
  { key: "phone", icon: PhoneForwarded },
  { key: "calendar", icon: CalendarDays },
  { key: "tools", icon: Webhook },
  { key: "whatsapp", brand: "assistant-whatsapp" },
  { key: "messenger", brand: "assistant-facebook" },
  { key: "instagram", brand: "assistant-instagram" },
] as const;

// Les canaux en étoile autour d'Automerio, reliés au centre par des rayons en
// pointillés que parcourt une impulsion (DESIGN.md, Mouvement). Décoratif :
// la liste porte le contenu. Rayon en unités de conteneur (cqw) pour suivre
// la largeur de l'illustration ; le premier canal est en haut.
const SPOKE_LENGTH = "calc(50cqw - 1.25rem)";

function IntegrationsBeams() {
  return (
    <MotionScene className="relative mx-auto mt-12 aspect-square w-full max-w-[18rem] [container-type:inline-size] sm:max-w-xs">
      <div aria-hidden="true" className="absolute inset-0">
        {INTEGRATIONS.map((item, index) => {
          const angle = (360 / INTEGRATIONS.length) * index - 90;
          return (
            <div key={item.key}>
              <div
                className="absolute top-1/2 left-1/2 -mt-px h-0.5 origin-left overflow-hidden"
                style={{ width: SPOKE_LENGTH, transform: `rotate(${angle}deg)` }}
              >
                <div className="absolute inset-0 border-t-2 border-dashed border-border" />
                <span
                  className={`absolute top-0 left-0 h-0.5 w-4 bg-primary ${motion.beam}`}
                  style={{ ["--beam-length" as string]: SPOKE_LENGTH }}
                />
              </div>
              <div
                className="absolute top-1/2 left-1/2 -mt-5 -ml-5"
                style={{ transform: `rotate(${angle}deg) translateX(${SPOKE_LENGTH}) rotate(${-angle}deg)` }}
              >
                <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
                  {"brand" in item ? (
                    <ServiceGlyph slug={item.brand} className="size-5" />
                  ) : (
                    <item.icon className="size-5 text-primary" />
                  )}
                </span>
              </div>
            </div>
          );
        })}
        <span className="absolute top-1/2 left-1/2 flex size-18 -translate-1/2 items-center justify-center rounded-lg border-2 border-primary/25 bg-card shadow-sm">
          <AutomerioMark decorative className="size-12 rounded-lg" />
        </span>
      </div>
    </MotionScene>
  );
}

export async function IntegrationsSection() {
  const t = await getTranslations("Home.integrations");
  return (
    <section aria-labelledby="integrations-heading" className="relative isolate overflow-hidden border-t border-border bg-muted/40 py-24 sm:py-32">
      <SectionGlow position="right" strength={10} />
      <div className="mx-auto grid max-w-[80rem] gap-10 px-4 sm:px-6 lg:grid-cols-5 lg:gap-16">
        <div className="lg:col-span-2">
          <h2
            id="integrations-heading"
            className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
          <IntegrationsBeams />
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
