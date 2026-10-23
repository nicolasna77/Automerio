import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Faq } from "@/lib/site";
import { cn } from "@/lib/utils";

export function FaqList({ items, className }: { items: Faq[]; className?: string }) {
  return (
    <Card className={cn("gap-0 divide-y divide-border py-0 text-base", className)}>
      {/* La réponse se déplie (DESIGN.md, Mouvement) : sa hauteur passe de
          0 à auto grâce à interpolate-size. Un navigateur sans
          ::details-content l'ouvre d'un coup, comme avant. */}
      {items.map((faq) => (
        <details
          key={faq.question}
          className="group px-(--card-spacing) py-5 [interpolate-size:allow-keywords] details-content:h-0 details-content:overflow-hidden details-content:transition-[height,content-visibility] details-content:duration-200 details-content:ease-out details-content:[transition-behavior:allow-discrete] open:details-content:h-auto motion-reduce:details-content:transition-none"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            {faq.question}
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {faq.answer}
          </p>
        </details>
      ))}
    </Card>
  );
}
