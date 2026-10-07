import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, CalendarCheck, ChevronRight, MessageCircle, PhoneIncoming } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProductScreenshot } from "@/components/product-screenshot";
import { isWaitlistMode } from "@/lib/launch-mode";

// Carte superposée à la capture : trois événements d'une matinée, un par
// canal (appel, message, rendez-vous), pour montrer d'un coup d'œil que
// l'assistant ne fait pas que décrocher. Illustration, masquée aux lecteurs
// d'écran : la capture porte déjà son texte alternatif.
async function ActivityCard() {
  const t = await getTranslations("Home.hero.activity");
  const events = [
    { key: "call", icon: PhoneIncoming },
    { key: "message", icon: MessageCircle },
    { key: "booking", icon: CalendarCheck },
  ] as const;
  return (
    <div
      aria-hidden="true"
      className="absolute right-0 bottom-24 hidden w-72 rounded-lg border border-border bg-card p-4 shadow-lg lg:block xl:-right-6"
    >
      <p className="text-sm font-medium text-foreground">{t("title")}</p>
      <ul className="mt-3 space-y-3 border-t border-border pt-3 text-xs leading-snug">
        {events.map(({ key, icon: Icon }) => (
          <li key={key} className="flex items-start gap-2.5">
            <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-foreground">{t(`${key}.title`)}</span>
                <span className="font-mono tabular-nums text-muted-foreground">{t(`${key}.time`)}</span>
              </span>
              <span className="mt-0.5 block text-muted-foreground">{t(`${key}.detail`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Traits lumineux qui descendent le long des lignes verticales de la trame :
// colonne (multiple de 6rem, le pas de la trame), durée et décalage en
// secondes. Les décalages négatifs évitent que tout parte en même temps.
const HERO_BEAMS = [
  { column: 2, duration: 7, delay: -2 },
  { column: 4, duration: 5.5, delay: -4 },
  { column: 6, duration: 8, delay: -1 },
  { column: 8, duration: 6, delay: -5 },
  { column: 10, duration: 7.5, delay: -3 },
  { column: 12, duration: 6.5, delay: -6 },
  { column: 14, duration: 8.5, delay: -2.5 },
] as const;

// Trame de fond du hero : lignes fines et un point à chaque croisement,
// estompée vers les bords, parcourue de traits lumineux (seule trame et seule
// animation décorative autorisées, DESIGN.md, Couleurs et Mouvement).
// Les traits vivent hors de la couche masquée : chacun est une couche à part
// que le navigateur déplace sans rien redessiner, sinon le hero entier serait
// repeint à chaque image et le défilement saccaderait.
function HeroGrid() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 mask-[radial-gradient(ellipse_70%_60%_at_50%_0%,black_40%,transparent_100%)]"
        style={{
          backgroundImage: [
            "radial-gradient(circle, var(--border) 1.5px, transparent 1.6px)",
            "linear-gradient(to right, var(--border) 1px, transparent 1px)",
            "linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "6rem 6rem",
          backgroundPosition: "-0.5px -0.5px, -0.5px 0, 0 -0.5px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60%] overflow-hidden @container-size motion-reduce:hidden"
      >
        {HERO_BEAMS.map((beam) => (
          <span
            key={beam.column}
            className="absolute top-0 h-28 w-px bg-linear-to-b from-transparent via-primary/60 to-primary will-change-transform"
            style={{
              left: `calc(${beam.column} * 6rem - 0.5px)`,
              animation: `hero-beam ${beam.duration}s linear ${beam.delay}s infinite`,
            }}
          />
        ))}
      </div>
    </>
  );
}

export async function HeroSection() {
  const waitlist = isWaitlistMode();
  const [t, tShots, tWaitlist] = await Promise.all([
    getTranslations("Home.hero"),
    getTranslations("Screenshots"),
    getTranslations("Waitlist"),
  ]);

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      <HeroGrid />
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24 sm:pb-16">
        <Link
          href={waitlist ? "#waitlist" : "#services"}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:focus-ring"
        >
          {waitlist ? t("badgeWaitlist") : t("badge")}
          <ChevronRight
            className="size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
        </Link>

        <h1 className="mx-auto mt-8 max-w-4xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
          {t("lead")}
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
          <Link
            href={waitlist ? "#waitlist" : "/signup"}
            className={buttonVariants({ size: "lg" })}
          >
            {waitlist ? tWaitlist("cta") : t("signup")}
            <ArrowRight data-icon="inline-end" />
          </Link>
          <Link
            href="#method"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:focus-ring"
          >
            {t("howItWorks")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <ProductScreenshot
          name="dashboard-overview"
          width={1280}
          height={800}
          alt={tShots("overviewAlt")}
          caption={tShots("demoCaption")}
          sizes="(min-width: 1152px) 1104px, 100vw"
          captionClassName="text-center"
          showcase
          priority
        />
        <ActivityCard />
      </div>
    </section>
  );
}
