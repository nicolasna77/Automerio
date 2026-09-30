import Image from "next/image";
import { cn } from "@/lib/utils";

export function ProductScreenshot({
  name,
  width,
  height,
  alt,
  caption,
  priority = false,
  sizes,
  windowUrl,
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
  windowUrl?: string;
  captionClassName?: string;
  className?: string;
  // Hero de l'accueil : double cadre, et la capture s'efface vers le bas. La
  // légende reste hors du fondu, toujours lisible (DESIGN.md, Images).
  showcase?: boolean;
}) {
  const frame = (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-md">
      {windowUrl && (
        <div aria-hidden="true" className="flex items-center gap-3 border-b border-border bg-muted px-3 py-2">
          <span className="flex gap-1.5">
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
          </span>
          <span className="flex-1 truncate rounded-sm bg-background px-2 py-0.5 text-center font-mono text-xs text-muted-foreground">
            {windowUrl}
          </span>
        </div>
      )}
      <Image
        src={`/screenshots/${name}-light.webp`}
        width={width}
        height={height}
        alt={alt}
        sizes={sizes}
        priority={priority}
        className="h-auto w-full dark:hidden"
      />
      <Image
        src={`/screenshots/${name}-dark.webp`}
        width={width}
        height={height}
        alt={alt}
        sizes={sizes}
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
