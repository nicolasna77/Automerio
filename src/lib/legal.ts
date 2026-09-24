const TO_COMPLETE = "[à compléter";

export const LEGAL_ENTITY = {
  tradeName: "Automerio",
  companyName: "[à compléter : dénomination sociale]",
  legalForm: "Société par actions simplifiée (SAS)",
  shareCapital: "[à compléter] €",
  headOffice: "[à compléter : adresse du siège social]",
  registration: "RCS [à compléter : ville] [à compléter : numéro SIREN]",
  vatNumber: "[à compléter : numéro de TVA intracommunautaire]",
  publicationDirector: "[à compléter : prénom et nom du président ou de la présidente]",
  email: "info@automerio.com",
  phone: "[à compléter : téléphone]",
  databaseHost: "[à compléter : hébergeur de la base de données et pays]",
};

export const HOSTING_PROVIDER = {
  name: "Vercel Inc.",
  address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  website: "https://vercel.com",
};

export const LEGAL_LAST_UPDATED = "25 septembre 2026";

export const REFUND_GUARANTEE_DAYS = 30;

export function legalFieldsToComplete(): string[] {
  return Object.entries(LEGAL_ENTITY)
    .filter(([, value]) => value.includes(TO_COMPLETE))
    .map(([key]) => key);
}
