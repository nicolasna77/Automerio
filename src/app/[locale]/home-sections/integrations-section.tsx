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

// Les canaux en orbite lente autour d'Automerio, reliés au centre par des
// faisceaux (DESIGN.md, Mouvement). Décoratif : la liste porte le contenu.
// Rayon en unités de conteneur (cqw) pour suivre la largeur de l'orbite.
const ORBIT_RADIUS = "calc(50cqw - 1.5rem)";

function IntegrationsOrbit() {
  return (
    <MotionScene className="relative mx-auto mt-12 aspect-square w-full max-w-[18rem] [container-type:inline-size] sm:max-w-xs">
      <div aria-hidden="true" className="absolute inset-0">
        <div className={`absolute inset-0 ${motion.orbit}`}>
          <div className="absolute inset-6 rounded-full border border-dashed border-border" />
          {INTEGRATIONS.map((item, index) => {
            const angle = (360 / INTEGRATIONS.length) * index;
            return (
              <div key={item.key}>
                <div
                  className="absolute top-1/2 left-1/2 h-px origin-left bg-border"
                  style={{ width: ORBIT_RADIUS, transform: `rotate(${angle}deg)` }}
                >
                  <span
                    className={`absolute -top-[2.5px] left-0 size-1.5 rounded-full bg-primary ${motion.beam}`}
                    style={{ ["--beam-length" as string]: ORBIT_RADIUS, animationDelay: `${index * 0.55}s` }}
                  />
                </div>
                <div
                  className="absolute top-1/2 left-1/2 -mt-6 -ml-6"
                  style={{ transform: `rotate(${angle}deg) translateX(${ORBIT_RADIUS}) rotate(${-angle}deg)` }}
                >
                  <span
                    className={`flex size-12 items-center justify-center rounded-lg border border-border bg-card shadow-sm ${motion.counter}`}
                  >
                    {"brand" in item ? (
                      <ServiceGlyph slug={item.brand} className="size-6" />
                    ) : (
                      <item.icon className="size-5 text-primary" />
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <AutomerioMark decorative className="absolute top-1/2 left-1/2 size-16 -translate-1/2 rounded-lg shadow-sm" />
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
          <IntegrationsOrbit />
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
