import { cn } from "@/lib/utils";

// Halo décoratif du site public (DESIGN.md, « Couleurs ») : une tache douce de
// la couleur principale, derrière le contenu d'une section. Tiré du jeton
// --primary (clair et sombre), 14 % d'opacité au plus, sans flou ni
// animation. La section porte `relative isolate overflow-hidden`.
const POSITIONS = {
  top: "left-1/2 -top-48 h-[28rem] w-[60rem] -translate-x-1/2",
  left: "-left-56 top-1/4 h-[32rem] w-[40rem]",
  right: "-right-56 top-1/3 h-[32rem] w-[40rem]",
  bottom: "left-1/2 -bottom-56 h-[28rem] w-[60rem] -translate-x-1/2",
} as const;

export function SectionGlow({
  position,
  strength = 12,
  className,
}: {
  position: keyof typeof POSITIONS;
  strength?: 8 | 10 | 12 | 14;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className={cn("absolute", POSITIONS[position], className)}
        style={{
          background: `radial-gradient(closest-side, color-mix(in oklab, var(--primary) ${strength}%, transparent), transparent)`,
        }}
      />
    </div>
  );
}
