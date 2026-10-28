"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import styles from "./illustration-motion.module.css";

// Illustrations animées du site public (DESIGN.md, Mouvement). Une scène ne
// bouge que visible à l'écran et tant que le visiteur ne l'a pas mise en
// pause (bouton, WCAG 2.2.2) : sinon ses animations CSS s'arrêtent
// (data-paused) et sa séquence aussi. « Réduire les animations », le rendu
// serveur et l'absence de JavaScript montrent l'illustration complète et
// immobile.

const SceneContext = createContext({ playing: false, reduced: true });

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    // Côté serveur : immobile, comme sans JavaScript.
    () => true
  );
}

export function MotionScene({ className, children }: { className?: string; children: ReactNode }) {
  const t = useTranslations("Illustrations.motion");
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const playing = visible && !reduced && !paused;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.25,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const context = useMemo(() => ({ playing, reduced }), [playing, reduced]);

  return (
    <SceneContext.Provider value={context}>
      <div ref={ref} data-paused={playing ? undefined : ""} className={cn("relative", className)}>
        {children}
        {!reduced && (
          <button
            type="button"
            onClick={() => setPaused((current) => !current)}
            aria-label={paused ? t("play") : t("pause")}
            className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:focus-ring"
          >
            {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
          </button>
        )}
      </div>
    </SceneContext.Provider>
  );
}

const TICK_MS = 1100;
// Temps passé sur la séquence complète avant de la rejouer.
const HOLD_TICKS = 4;

type Phase = { step: number; kind: "typing" | "show" };

// typing[i] : l'étape i est une réponse de l'assistant, précédée de
// « l'assistant écrit ».
function phasesOf(typing: boolean[]): Phase[] {
  return typing.flatMap((withTyping, index): Phase[] =>
    withTyping
      ? [
          { step: index, kind: "typing" },
          { step: index, kind: "show" },
        ]
      : [{ step: index, kind: "show" }]
  );
}

const SequenceContext = createContext<{ shown: (index: number) => boolean; typing: (index: number) => boolean }>({
  shown: () => true,
  typing: () => false,
});

// Étapes (messages, fiche résumé) qui arrivent l'une après l'autre. Une
// illustration décorative rejoue en boucle ; un vrai contenu (`loop={false}`,
// la transcription d'un appel type) se joue une fois et reste affiché, pour
// être lu. Chaque étape garde sa place : l'illustration ne saute pas.
export function Sequence({
  typing,
  loop = true,
  children,
}: {
  typing: boolean[];
  loop?: boolean;
  children: ReactNode;
}) {
  const { playing, reduced } = useContext(SceneContext);
  const phases = useMemo(() => phasesOf(typing), [typing]);
  const total = phases.length;
  // Position de la phase « affichée » de chaque étape.
  const showAt = useMemo(
    () => typing.map((_, index) => phases.findIndex((phase) => phase.step === index && phase.kind === "show")),
    [phases, typing]
  );
  // Démarre vide : la séquence se remplit à l'entrée dans l'écran.
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current < total + HOLD_TICKS) return current + 1;
        return loop ? 0 : current;
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [playing, total, loop]);

  // Animations réduites (même activées en cours de route) : tout affiché.
  const displayed = reduced ? total : Math.min(step, total);
  const current = !reduced && step > 0 && step <= total ? phases[step - 1] : null;

  const value = useMemo(
    () => ({
      shown: (index: number) => showAt[index] < displayed,
      typing: (index: number) => showAt[index] >= displayed && current?.kind === "typing" && current.step === index,
    }),
    [showAt, displayed, current]
  );

  return <SequenceContext.Provider value={value}>{children}</SequenceContext.Provider>;
}

// Une étape de la séquence, placée où l'on veut dans l'illustration.
export function Step({
  index,
  align = "start",
  as: Tag = "div",
  className,
  children,
}: {
  index: number;
  align?: "start" | "end";
  // « li » dans une liste (transcription d'un appel).
  as?: "div" | "li";
  className?: string;
  children: ReactNode;
}) {
  const sequence = useContext(SequenceContext);
  const shown = sequence.shown(index);
  return (
    <Tag className={cn("relative", className)}>
      <div
        className={cn(
          "transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          shown ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
        )}
      >
        {children}
      </div>
      {sequence.typing(index) && (
        <div className={cn("absolute inset-y-0 flex items-start", align === "end" ? "right-0" : "left-0")}>
          <TypingDots />
        </div>
      )}
    </Tag>
  );
}

// Même forme que les bulles des illustrations (Bubble).
export function TypingDots({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex items-center gap-1 rounded-2xl bg-muted px-3 py-2.5", className)}
    >
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className={cn("size-1.5 rounded-full bg-muted-foreground", styles.typingDot)}
          style={{ animationDelay: `${dot * 150}ms` }}
        />
      ))}
    </span>
  );
}

// Onde d'un appel en cours.
export function WaveBars({ bars }: { bars: number[] }) {
  return (
    <div aria-hidden="true" className="flex h-6 items-center gap-[3px]">
      {bars.map((height, index) => (
        <span
          key={index}
          className={cn("w-[3px] rounded-full bg-primary/70", styles.wave)}
          style={{ height: `${height + 4}px`, animationDelay: `${(index % 7) * -160}ms` }}
        />
      ))}
    </div>
  );
}
