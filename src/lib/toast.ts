import { toast as sonnerToast, type ExternalToast } from "sonner";

// Une erreur reste affichée jusqu'à ce que l'utilisateur la ferme : disparue
// au bout de quatre secondes, elle échappe à qui lit lentement ou navigue au
// lecteur d'écran. Elle se retire d'elle-même quand elle n'a plus lieu d'être :
// une action suivante réussit, ou l'utilisateur change de page.
const openErrors = new Set<string | number>();

export function dismissErrorToasts() {
  for (const id of openErrors) sonnerToast.dismiss(id);
  openErrors.clear();
}

export const toast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  sonnerToast,
  {
    error: (message: Parameters<typeof sonnerToast.error>[0], data?: ExternalToast) => {
      const id = sonnerToast.error(message, {
        duration: Infinity,
        closeButton: true,
        ...data,
        onDismiss: (t) => {
          openErrors.delete(t.id);
          data?.onDismiss?.(t);
        },
      });
      openErrors.add(id);
      return id;
    },
    success: (message: Parameters<typeof sonnerToast.success>[0], data?: ExternalToast) => {
      dismissErrorToasts();
      return sonnerToast.success(message, data);
    },
  }
);
