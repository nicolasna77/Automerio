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
      {showcase ? (
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
