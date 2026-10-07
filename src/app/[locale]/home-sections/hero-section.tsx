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

// Traits lumineux qui suivent les lignes de la trame : ils descendent, tournent
// à un croisement, longent une ligne horizontale puis redescendent. Chaque
// tracé est une suite de croisements (colonne, rangée), au pas de la trame
// (6rem). La rangée -1 est au-dessus du hero : le trait entre par le haut.
const CELL_PX = 96;
const HERO_TRACES = [
  { points: [[2, -1], [2, 2], [4, 2], [4, 5]], duration: 9, delay: -2 },
  { points: [[5, -1], [5, 1], [6, 1], [6, 3], [5, 3], [5, 5]], duration: 11, delay: -7 },
  { points: [[8, -1], [8, 3], [7, 3], [7, 5]], duration: 8, delay: -4 },
  { points: [[10, -1], [10, 1], [12, 1], [12, 4]], duration: 10, delay: -1 },
  { points: [[13, -1], [13, 2], [14, 2], [14, 5]], duration: 8.5, delay: -6 },
  { points: [[16, -1], [16, 3], [15, 3], [15, 5]], duration: 9.5, delay: -3 },
  { points: [[11, -1], [11, 3], [9, 3], [9, 5]], duration: 12, delay: -9 },
] as const;

// Longueur lumineuse : une tête vive et une traînée plus pâle, alignées sur le
// même front ; une pause (hors du tracé) espace les passages.
const HEAD_PX = 44;
const TAIL_PX = 150;

// Rayon des virages : le trait ne casse pas à angle droit, il tourne en arc.
const TURN_RADIUS_PX = 20;

function traceGeometry(points: readonly (readonly [number, number])[]) {
  const px = points.map(([column, row]) => [column * CELL_PX, row * CELL_PX] as const);
  const r = TURN_RADIUS_PX;
  let d = `M${px[0][0]} ${px[0][1]}`;
  let length = 0;
  for (let i = 1; i < px.length; i++) {
    const [x0, y0] = px[i - 1];
    const [x, y] = px[i];
    const segment = Math.abs(x - x0) + Math.abs(y - y0);
    const next = px[i + 1];
    if (!next) {
      d += ` L${x} ${y}`;
      length += segment - (i > 1 ? r : 0);
      continue;
    }
    // Virage en (x, y) : on s'arrête r pixels avant le croisement, puis un
    // quart de cercle rejoint la ligne suivante r pixels après.
    const inX = Math.sign(x - x0);
    const inY = Math.sign(y - y0);
    const outX = Math.sign(next[0] - x);
    const outY = Math.sign(next[1] - y);
    const sweep = inX * outY - inY * outX > 0 ? 1 : 0;
    d += ` L${x - inX * r} ${y - inY * r} A${r} ${r} 0 0 ${sweep} ${x + outX * r} ${y + outY * r}`;
    length += segment - r - (i > 1 ? r : 0) + (Math.PI * r) / 2;
  }
  return { d, length };
}

// Trame de fond du hero : lignes fines et un point à chaque croisement,
// estompée vers les bords, parcourue de traits lumineux (seule trame et seule
// animation décorative autorisées, DESIGN.md, Couleurs et Mouvement).
// Les traits sont un SVG à part, dans sa propre couche (will-change), estompé
// par le même masque que la trame : seul ce SVG est redessiné quand les
// traits avancent, pas le hero entier.
const GRID_MASK = "mask-[radial-gradient(ellipse_70%_60%_at_50%_0%,black_40%,transparent_100%)]";

function HeroGrid() {
  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 -z-10 ${GRID_MASK}`}
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
        className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden will-change-transform motion-reduce:hidden ${GRID_MASK}`}
      >
        <svg className="absolute top-0 left-0" width={CELL_PX * 17} height={CELL_PX * 6} fill="none">
          {HERO_TRACES.map((trace) => {
            const { d, length } = traceGeometry(trace.points);
            // Le front lumineux part du début du tracé et va jusqu'après sa
            // fin, plus une pause : stroke-dashoffset décroît de la longueur
            // du trait jusqu'à -(tracé + pause).
            const travel = length + TAIL_PX + length * 0.4;
            const layers = [
              { dash: TAIL_PX, opacity: 0.3 },
              { dash: HEAD_PX, opacity: 0.9 },
            ];
            return layers.map((layer) => (
              <path
                key={`${trace.points[0][0]}-${layer.dash}`}
                d={d}
                stroke="var(--primary)"
                strokeOpacity={layer.opacity}
                strokeWidth={1}
                strokeDasharray={`${layer.dash} ${travel + TAIL_PX}`}
                style={
                  {
                    "--trace-from": `${layer.dash}px`,
                    "--trace-to": `${layer.dash - travel}px`,
                    animation: `hero-trace ${trace.duration}s linear ${trace.delay}s infinite`,
                  } as React.CSSProperties
                }
              />
            ));
          })}
        </svg>
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
