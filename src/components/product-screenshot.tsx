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
  className,
}: {
  name: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  priority?: boolean;
  sizes: string;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-md">
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
      <figcaption className="mt-2 text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}
