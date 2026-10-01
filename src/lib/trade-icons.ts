import { Building2, Hammer, Scissors, Users, UtensilsCrossed, type LucideIcon } from "lucide-react";

// Icône de chaque métier : la même dans le menu, sur l'accueil et sur la page.
export const TRADE_ICONS: Record<string, LucideIcon> = {
  tradespeople: Hammer,
  "hair-beauty": Scissors,
  coaches: Users,
  restaurants: UtensilsCrossed,
  "professional-services": Building2,
};
