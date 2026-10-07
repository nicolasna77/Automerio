// Vérifie auprès de l'API Graph que les identifiants Meta transmis par le
// navigateur (WABA, numéro WhatsApp) appartiennent bien au jeton obtenu par
// l'échange du code : sans ce contrôle, un client pourrait rattacher à sa
// solution le numéro d'une autre entreprise.

const GRAPH_API_VERSION = "v21.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Les identifiants Graph sont numériques. On refuse tout le reste avant de
// les insérer dans une URL (« ../ », « ? », etc.).
export function isGraphId(value: unknown): value is string {
  return typeof value === "string" && /^\d{1,32}$/.test(value);
}

type GraphList = { data?: { id?: string }[]; paging?: { next?: string } };

export function listContainsId(list: GraphList, id: string): boolean {
  return (list.data ?? []).some((item) => item.id === id);
}

async function graphGet(url: string, accessToken: string): Promise<unknown | null> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  return res.json();
}

const MAX_PAGES = 10;

async function pagedListContains(firstUrl: string, accessToken: string, id: string): Promise<boolean> {
  let url: string | undefined = firstUrl;
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const list = (await graphGet(url, accessToken)) as GraphList | null;
    if (!list) return false;
    if (listContainsId(list, id)) return true;
    const next: string | undefined = list.paging?.next;
    // Le jeton part dans l'en-tête : on ne suit qu'une pagination vers Graph.
    url = next?.startsWith("https://graph.facebook.com/") ? next : undefined;
  }
  return false;
}

// Le WABA doit être lisible avec le jeton, et le numéro doit figurer parmi
// ceux de ce WABA.
export async function whatsAppNumberBelongsToToken(
  wabaId: string,
  phoneNumberId: string,
  accessToken: string
): Promise<boolean> {
  if (!isGraphId(wabaId) || !isGraphId(phoneNumberId)) return false;

  const waba = (await graphGet(`${GRAPH_URL}/${wabaId}?fields=id`, accessToken)) as { id?: string } | null;
  if (waba?.id !== wabaId) return false;

  return pagedListContains(`${GRAPH_URL}/${wabaId}/phone_numbers?fields=id&limit=100`, accessToken, phoneNumberId);
}

// La Page doit figurer parmi celles que le jeton administre (/me/accounts).
export async function pageBelongsToToken(pageId: string, userAccessToken: string): Promise<boolean> {
  if (!isGraphId(pageId)) return false;
  return pagedListContains(`${GRAPH_URL}/me/accounts?fields=id&limit=100`, userAccessToken, pageId);
}
