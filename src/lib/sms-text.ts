// Texte venu d'un inconnu (dicté par un appelant, reformulé par le modèle de
// résumé) avant d'entrer dans un SMS envoyé sous notre nom : sans lien ni
// adresse web, pour qu'un appelant ne puisse pas faire parvenir un lien de
// hameçonnage au mobile d'un client. Les domaines nus ne sont retirés que sur
// des extensions courantes : « J.Martin » ou « St.Étienne » restent intacts.
const URL_WITH_SCHEME = /\b(?:https?:\/\/|www\.)\S+/gi;
const BARE_DOMAIN =
  /\b[\w-]+(?:\.[\w-]+)*\.(?:com|fr|net|org|eu|io|co|me|ly|info|biz|xyz|link|app|site|online|top|shop|click|be|ch|ca|uk|de|es|it|ru|cn|tk|gg|to)\b(?:\/\S*)?/gi;

export function stripLinks(text: string): string {
  return text.replace(URL_WITH_SCHEME, "").replace(BARE_DOMAIN, "").replace(/\s{2,}/g, " ").trim();
}
