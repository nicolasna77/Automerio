import { Prisma } from "@prisma/client";

// Un numéro WhatsApp, une page Facebook ou un compte Instagram ne peut être
// relié qu'à une seule solution (index uniques). Une solution résiliée doit
// donc les libérer, sinon le client ne peut plus jamais les reconnecter à une
// nouvelle solution. Mêmes champs que les actions « Déconnecter » du tableau
// de bord.
export const CLEARED_META_CONNECTION = {
  whatsappPhoneNumberId: null,
  whatsappBusinessAccountId: null,
  whatsappAccessToken: null,
  whatsappDisplayNumber: null,
  facebookPageId: null,
  facebookPageAccessToken: null,
  facebookPageName: null,
  instagramAccountId: null,
  instagramAccessToken: null,
  instagramTokenExpiresAt: null,
  instagramUsername: null,
} as const satisfies Prisma.ClientServiceUpdateManyMutationInput;

export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
