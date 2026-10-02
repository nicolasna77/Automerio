// Partagé entre le serveur et la messagerie du tableau de bord (sans Prisma).

// Meta refuse un message libre plus de 24 h après le dernier message du contact.
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MAX_REPLY_LENGTH = 1000;
