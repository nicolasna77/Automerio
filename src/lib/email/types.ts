export const NOTIFICATION_TYPES = [
  "HELP_REQUEST_REPLY",
  "HELP_REQUEST_RESOLVED",
  "SERVICE_ACTIVATED",
  "SERVICE_NOTE_ADDED",
  "SERVICE_CANCELED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  HELP_REQUEST_REPLY: "Réponse de l'équipe dans une demande d'aide",
  HELP_REQUEST_RESOLVED: "Demande d'aide marquée comme traitée",
  SERVICE_ACTIVATED: "Activation d'une solution",
  SERVICE_NOTE_ADDED: "Note ajoutée par l'équipe",
  SERVICE_CANCELED: "Confirmation de résiliation",
};

export const NOTIFICATION_TYPE_DESCRIPTIONS: Record<NotificationType, string> = {
  HELP_REQUEST_REPLY:
    "Quand l'équipe Automerio répond dans le fil d'une de vos demandes d'aide.",
  HELP_REQUEST_RESOLVED:
    "Quand l'équipe Automerio marque votre demande d'aide comme traitée.",
  SERVICE_ACTIVATED: "Quand une solution payée devient active.",
  SERVICE_NOTE_ADDED: "Quand l'équipe ajoute une note sur une de vos solutions.",
  SERVICE_CANCELED: "Confirmation quand vous résiliez vous-même une solution.",
};
