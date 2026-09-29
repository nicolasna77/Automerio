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
}) {
  return (
    <figure className={className}>
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
      <figcaption className={cn("mt-2 text-xs text-muted-foreground", captionClassName)}>{caption}</figcaption>
    </figure>
  );
}
