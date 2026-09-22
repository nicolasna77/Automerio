import { db } from "@/lib/db";
import { requireEnv } from "@/lib/env";
import { signOAuthState, verifyOAuthState } from "@/lib/oauth-state";
import { logServiceEvent } from "@/lib/service-events";

const INSTAGRAM_AUTH_URL = "https://www.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";
const INSTAGRAM_SCOPE = "instagram_business_basic,instagram_business_manage_messages";

const FEATURE = "la messagerie Instagram";

function signState(clientServiceId: string): string {
  return signOAuthState(requireEnv("INSTAGRAM_OAUTH_STATE_SECRET", FEATURE), clientServiceId);
}

export function verifyInstagramState(state: string): string | null {
  return verifyOAuthState(requireEnv("INSTAGRAM_OAUTH_STATE_SECRET", FEATURE), state);
}

export function buildInstagramAuthUrl(clientServiceId: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("INSTAGRAM_APP_ID", FEATURE),
    redirect_uri: requireEnv("INSTAGRAM_OAUTH_REDIRECT_URI", FEATURE),
    response_type: "code",
    scope: INSTAGRAM_SCOPE,
    state: signState(clientServiceId),
  });
  return `${INSTAGRAM_AUTH_URL}?${params.toString()}`;
}

type ShortLivedTokenResponse = { access_token: string; user_id: string };
type LongLivedTokenResponse = { access_token: string; expires_in: number };

async function exchangeShortLivedToken(code: string): Promise<ShortLivedTokenResponse> {
  const res = await fetch(INSTAGRAM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("INSTAGRAM_APP_ID", FEATURE),
      client_secret: requireEnv("INSTAGRAM_APP_SECRET", FEATURE),
      grant_type: "authorization_code",
      redirect_uri: requireEnv("INSTAGRAM_OAUTH_REDIRECT_URI", FEATURE),
      code,
    }),
  });
  if (!res.ok) {
    throw new Error(`Échec de l'échange du code Instagram : ${await res.text()}`);
  }
  return res.json();
}

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: requireEnv("INSTAGRAM_APP_SECRET", FEATURE),
    access_token: shortLivedToken,
  });
  const res = await fetch(`${INSTAGRAM_GRAPH_URL}/access_token?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Échec de l'obtention d'un jeton Instagram longue durée : ${await res.text()}`);
  }
  return res.json();
}

async function fetchInstagramUsername(userId: string, accessToken: string): Promise<string | null> {
  const res = await fetch(
    `${INSTAGRAM_GRAPH_URL}/${userId}?fields=username&access_token=${encodeURIComponent(accessToken)}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { username?: string };
  return data.username ?? null;
}

export async function completeInstagramConnection(clientServiceId: string, code: string) {
  const shortLived = await exchangeShortLivedToken(code);
  const longLived = await exchangeForLongLivedToken(shortLived.access_token);
  const username = await fetchInstagramUsername(shortLived.user_id, longLived.access_token);

  await db.clientService.update({
    where: { id: clientServiceId },
    data: {
      instagramAccountId: shortLived.user_id,
      instagramAccessToken: longLived.access_token,
      instagramTokenExpiresAt: new Date(Date.now() + longLived.expires_in * 1000),
      instagramUsername: username,
    },
  });
  await logServiceEvent(clientServiceId, "INSTAGRAM_CONNECTED", username);
}

async function refreshLongLivedToken(accessToken: string): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: accessToken });
  const res = await fetch(`${INSTAGRAM_GRAPH_URL}/refresh_access_token?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Échec du rafraîchissement du jeton Instagram : ${await res.text()}`);
  }
  return res.json();
}

export async function getValidInstagramToken(clientServiceId: string): Promise<string | null> {
  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    select: { instagramAccessToken: true, instagramTokenExpiresAt: true },
  });
  if (!clientService?.instagramAccessToken || !clientService.instagramTokenExpiresAt) return null;

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (clientService.instagramTokenExpiresAt.getTime() - Date.now() > sevenDaysMs) {
    return clientService.instagramAccessToken;
  }

  const refreshed = await refreshLongLivedToken(clientService.instagramAccessToken);
  await db.clientService.update({
    where: { id: clientServiceId },
    data: {
      instagramAccessToken: refreshed.access_token,
      instagramTokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });
  return refreshed.access_token;
}

export async function sendInstagramMessage(igUserId: string, to: string, body: string, accessToken: string): Promise<void> {
  const res = await fetch(`${INSTAGRAM_GRAPH_URL}/${igUserId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient: { id: to }, message: { text: body } }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Échec d'envoi Instagram (${res.status}) : ${detail}`);
  }
}
