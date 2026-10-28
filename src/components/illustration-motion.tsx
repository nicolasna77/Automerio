"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import styles from "./illustration-motion.module.css";

// Illustrations animées du site public (DESIGN.md, Mouvement). Une scène ne
// bouge que visible à l'écran : hors écran, ses animations CSS sont en pause
// (data-paused) et sa séquence de messages s'arrête. « Réduire les
// animations » laisse l'illustration complète et immobile.

const SceneContext = createContext({ playing: false });

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
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.25,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <SceneContext.Provider value={{ playing: visible && !reduced }}>
      <div ref={ref} data-paused={visible ? undefined : ""} className={className}>
        {children}
      </div>
    </SceneContext.Provider>
  );
}

const TICK_MS = 1100;
// Temps passé sur la conversation complète avant de la rejouer.
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

// Étapes (messages, fiche résumé) qui arrivent l'une après l'autre, puis la
// séquence reprend. Au premier rendu (serveur, sans JavaScript, animations
// réduites), tout est affiché ; chaque étape garde sa place pour que
// l'illustration ne saute pas.
export function Sequence({ typing, children }: { typing: boolean[]; children: ReactNode }) {
  const { playing } = useContext(SceneContext);
  const phases = phasesOf(typing);
  const total = phases.length;
  const [step, setStep] = useState(total);
  const started = useRef(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      // Première entrée à l'écran : la conversation repart du début.
      if (!started.current) {
        started.current = true;
        setStep(0);
        return;
      }
      setStep((current) => (current >= total + HOLD_TICKS ? 0 : current + 1));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [playing, total]);

  const shownUntil = Math.min(step, total);
  const current = step > 0 && step <= total ? phases[step - 1] : null;
  const shown = (index: number) =>
    phases.findIndex((phase) => phase.step === index && phase.kind === "show") < shownUntil;
  const typingAt = (index: number) => !shown(index) && current?.kind === "typing" && current.step === index;

  return <SequenceContext.Provider value={{ shown, typing: typingAt }}>{children}</SequenceContext.Provider>;
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
