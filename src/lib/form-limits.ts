// Longueurs maximales des formulaires qui envoient un e-mail à l'équipe
// (contact, centre d'aide). Partagées entre les Server Actions, qui font foi,
// et les champs (`maxLength`) ; sans Prisma, importables côté client.
export const SHORT_FIELD_MAX = 200;
export const LONG_FIELD_MAX = 5000;
