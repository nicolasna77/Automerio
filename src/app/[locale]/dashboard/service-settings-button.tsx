"use client";

import { Settings } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { canEditConfiguration, type MyServiceDTO } from "@/lib/catalog";
import { cn } from "@/lib/utils";

// Accès direct aux réglages d'une solution : une icône avec infobulle dans les
// listes, un bouton avec son libellé dans l'en-tête du détail. Rien quand la
// solution ne se configure pas (résiliée, en attente de paiement, sans champ).
export function ServiceSettingsButton({
  item,
  labeled = false,
  className,
}: {
  item: Pick<MyServiceDTO, "clientServiceId" | "name" | "status" | "service">;
  labeled?: boolean;
  className?: string;
}) {
  if (!canEditConfiguration(item)) return null;
  const href = `/dashboard/services/${item.clientServiceId}/configuration`;

  if (labeled) {
    return (
      <Link href={href} className={buttonVariants({ variant: "outline", className })}>
        <Settings aria-hidden="true" data-icon="inline-start" />
        Réglages
      </Link>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            aria-label={`Réglages de « ${item.name} »`}
            className={buttonVariants({ variant: "ghost", size: "icon", className: cn("text-muted-foreground hover:text-foreground", className) })}
          />
        }
      >
        <Settings aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>Réglages</TooltipContent>
    </Tooltip>
  );
}
