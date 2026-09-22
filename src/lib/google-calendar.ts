import { db } from "@/lib/db";
import { requireEnv } from "@/lib/env";
import { signOAuthState, verifyOAuthState } from "@/lib/oauth-state";
import { logServiceEvent } from "@/lib/service-events";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

const FEATURE = "l'agenda Google";

function signState(clientServiceId: string): string {
  return signOAuthState(requireEnv("GOOGLE_OAUTH_STATE_SECRET", FEATURE), clientServiceId);
}

export function verifyState(state: string): string | null {
  return verifyOAuthState(requireEnv("GOOGLE_OAUTH_STATE_SECRET", FEATURE), state);
}

export function buildGoogleAuthUrl(clientServiceId: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID", FEATURE),
    redirect_uri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI", FEATURE),
    response_type: "code",
    scope: `${GOOGLE_CALENDAR_SCOPE} openid email`,
    access_type: "offline",
    prompt: "consent",
    state: signState(clientServiceId),
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
};

async function requestGoogleToken(
  context: string,
  grantParams: Record<string, string>
): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID", FEATURE),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET", FEATURE),
      ...grantParams,
    }),
  });
  if (!res.ok) {
    throw new Error(`${context} : ${await res.text()}`);
  }
  return res.json();
}

async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  return requestGoogleToken("Échange du code Google échoué", {
    redirect_uri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI", FEATURE),
    grant_type: "authorization_code",
    code,
  });
}

async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Récupération de l'e-mail Google échouée");
  const data = (await res.json()) as { email?: string };
  return data.email ?? "inconnu";
}

export async function completeGoogleCalendarConnection(
  clientServiceId: string,
  code: string
) {
  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.refresh_token) {
    throw new Error("Google n'a pas renvoyé de refresh_token");
  }
  const googleAccountEmail = await fetchGoogleEmail(tokens.access_token);

  const connectionData = {
    googleAccountEmail,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    scope: tokens.scope,
  };

  await db.calendarConnection.upsert({
    where: { clientServiceId },
    create: { clientServiceId, ...connectionData },
    update: connectionData,
  });
  await logServiceEvent(clientServiceId, "CALENDAR_CONNECTED", googleAccountEmail);
}

async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  return requestGoogleToken("Rafraîchissement du token Google échoué", {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export async function getValidAccessToken(
  clientServiceId: string
): Promise<{ accessToken: string; calendarId: string } | null> {
  const connection = await db.calendarConnection.findUnique({
    where: { clientServiceId },
  });
  if (!connection) return null;

  if (connection.accessTokenExpiresAt.getTime() - Date.now() > 60_000) {
    return { accessToken: connection.accessToken, calendarId: connection.calendarId };
  }

  const tokens = await refreshAccessToken(connection.refreshToken);
  await db.calendarConnection.update({
    where: { clientServiceId },
    data: {
      accessToken: tokens.access_token,
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
  return { accessToken: tokens.access_token, calendarId: connection.calendarId };
}

export async function isSlotFree(
  clientServiceId: string,
  startAt: Date,
  endAt: Date
): Promise<boolean> {
  const auth = await getValidAccessToken(clientServiceId);
  if (!auth) return false;

  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: startAt.toISOString(),
        timeMax: endAt.toISOString(),
        items: [{ id: auth.calendarId }],
      }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      calendars: Record<string, { busy: unknown[] }>;
    };
    const busy = data.calendars[auth.calendarId]?.busy ?? [];
    return busy.length === 0;
  } catch {
    return false;
  }
}

export async function createCalendarEvent(
  clientServiceId: string,
  event: { summary: string; description?: string; startAt: Date; endAt: Date }
): Promise<string | null> {
  const auth = await getValidAccessToken(clientServiceId);
  if (!auth) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          start: { dateTime: event.startAt.toISOString() },
          end: { dateTime: event.endAt.toISOString() },
        }),
      }
    );
    if (!res.ok) return null;
    const created = (await res.json()) as { id: string };
    return created.id;
  } catch {
    return null;
  }
}
