// Suggestions que le client peut refermer : le choix est gardé dans un cookie
// par solution, lu par la page côté serveur pour ne pas afficher la
// suggestion, même un instant, une fois refermée.
export const DISMISSAL_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function calendarSuggestionCookie(clientServiceId: string): string {
  return `masquer-suggestion-agenda-${clientServiceId}`;
}
