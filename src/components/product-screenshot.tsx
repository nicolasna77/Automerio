import Image from "next/image";
import { cn } from "@/lib/utils";

// Captures d'interface : du texte fin, que la compression par défaut (75)
// rend flou. 90 doit figurer dans images.qualities (next.config.ts).
const IMAGE_QUALITY = 90;

export function ProductScreenshot({
  name,
  width,
  height,
  alt,
  caption,
  priority = false,
  sizes,
  captionClassName,
  className,
  showcase = false,
  fragment = false,
}: {
  name: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  priority?: boolean;
  sizes: string;
  captionClassName?: string;
  className?: string;
  // Hero de l'accueil : double cadre, et la capture s'efface vers le bas. La
  // légende reste hors du fondu, toujours lisible (DESIGN.md, Images).
  showcase?: boolean;
  // Morceau de l'interface (onglets sous le hero) : posé sur un fond
  // pointillé, comme sur un plan de travail, avec une ombre qui le détache.
  fragment?: boolean;
}) {
  const frame = (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-md">
      <Image
        src={`/screenshots/${name}-light.webp`}
        width={width}
        height={height}
        alt={alt}
        sizes={sizes}
        priority={priority}
        quality={IMAGE_QUALITY}
        className="h-auto w-full dark:hidden"
      />
      <Image
        src={`/screenshots/${name}-dark.webp`}
        width={width}
        height={height}
        alt={alt}
        sizes={sizes}
        quality={IMAGE_QUALITY}
        className={cn("hidden h-auto w-full dark:block")}
      />
    </div>
  );

  return (
    <figure className={className}>
      {fragment ? (
        // Sur mobile, le morceau garde au moins 80 % de sa taille réelle pour
        // rester lisible : il part de la gauche et le fond le coupe à droite.
        <div className="flex justify-start overflow-hidden rounded-lg border border-border bg-muted/40 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:14px_14px] p-4 sm:justify-center sm:p-10">
          <div
            className="w-[max(100%,calc(var(--fragment-width)*0.8))] shrink-0 overflow-hidden rounded-lg shadow-lg sm:w-full sm:shrink"
            style={{ maxWidth: width, "--fragment-width": `${width}px` } as React.CSSProperties}
          >
            {frame}
          </div>
        </div>
      ) : showcase ? (
        <div className="rounded-lg border border-border bg-muted/50 p-1.5 shadow-sm [mask-image:linear-gradient(to_bottom,black_60%,transparent)] sm:p-2">
          {frame}
        </div>
      ) : (
        frame
      )}
      <figcaption className={cn("mt-2 text-xs text-muted-foreground", captionClassName)}>{caption}</figcaption>
    </figure>
  );
}
