import { toast as sonnerToast, type ExternalToast } from "sonner";

// Une erreur reste affichée jusqu'à ce que l'utilisateur la ferme : disparue
// au bout de quatre secondes, elle échappe à qui lit lentement ou navigue au
// lecteur d'écran. Les confirmations gardent la durée par défaut.
export const toast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  sonnerToast,
  {
    error: (message: Parameters<typeof sonnerToast.error>[0], data?: ExternalToast) =>
      sonnerToast.error(message, { duration: Infinity, closeButton: true, ...data }),
  }
);
