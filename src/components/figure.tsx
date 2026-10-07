import { cn } from "@/lib/utils";

const FIGURE = /^([+-]?\d[\d\s  .,]*\d|[+-]?\d)\s*(.*)$/;

// Sépare le nombre de son unité : « 6 000 min » → ["6 000", "min"].
// Renvoie null quand le texte ne commence pas par un nombre.
export function splitFigure(text: string): [figure: string, unit: string] | null {
  const match = FIGURE.exec(text.trim());
  return match ? [match[1], match[2]] : null;
}

// Une donnée déjà formatée (« 150 min », « 25 € TTC ») : le nombre en
// DM Mono, l'unité en texte courant. En chasse fixe, les espaces insécables
// de l'unité s'élargiraient autant qu'un chiffre.
export function Figure({
  text,
  className,
  unitClassName,
}: {
  text: string;
  className?: string;
  unitClassName?: string;
}) {
  const parts = splitFigure(text);
  if (!parts) return <span className={className}>{text}</span>;
  const [figure, unit] = parts;
  return (
    <span className={className}>
      <span className="font-mono tabular-nums">{figure}</span>
      {unit && <span className={cn("ml-1.5 font-sans", unitClassName)}>{unit}</span>}
    </span>
  );
}
