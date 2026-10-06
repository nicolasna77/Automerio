import { cache } from "react";
import { getMySubscriptions } from "@/lib/subscriptions";

// Les abonnements de l'entreprise, lus une seule fois par affichage de la vue
// d'ensemble : le bloc « À faire » et la liste des solutions s'en servent
// tous deux, et chaque lecture interroge Stripe.
export const getOverviewSubscriptions = cache(getMySubscriptions);
