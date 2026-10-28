"use server";

import { getTranslations } from "next-intl/server";
import { getOpenAIClient } from "@/lib/openai";
import { getCatalog } from "@/lib/get-catalog";
import { getSession } from "@/lib/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { formatPrice } from "@/lib/catalog";
import { formatUsageCap } from "@/lib/usage-cap";
import { getTrades, tradePath } from "@/lib/trades";
import { isDemoCallAvailable } from "@/lib/demo-call";
import { getFaqs } from "@/lib/site-metadata";
import { isWaitlistMode } from "@/lib/launch-mode";
import { actionError, runAction } from "@/lib/run-action";
import type { ActionResult } from "@/lib/action-result";
import {
  ASSISTANT_RESPONSE_SCHEMA,
  buildAssistantPrompt,
  parseAssistantOutput,
  sanitizeHistory,
  type AssistantAnswer,
  type ChatArea,
  type Destination,
} from "@/lib/assistant-chat";

const CHAT_MODEL = "gpt-5-mini";
// Trois phrases suffisent : un plafond borne le coût d'une question piégée.
const MAX_COMPLETION_TOKENS = 1200;
const OPENAI_TIMEOUT_MS = 20_000;

const PUBLIC_PAGES = [
  ["/", "home"],
  ["/#services", "pricing"],
  ["/#method", "method"],
  ["/#faq", "faq"],
  ["/contact", "contact"],
] as const;

const GUEST_PAGES = [
  ["/signup", "signup"],
  ["/login", "login"],
] as const;

const DASHBOARD_PAGES = [
  ["/dashboard", "overview"],
  ["/dashboard/services", "myServices"],
  ["/dashboard/services/catalog", "catalog"],
  ["/dashboard/calendar", "calendar"],
  ["/dashboard/subscriptions", "subscriptions"],
  ["/dashboard/payments", "payments"],
  ["/dashboard/organization", "organization"],
  ["/dashboard/profile", "profile"],
  ["/dashboard/help", "help"],
] as const;

type PageKey = (typeof PUBLIC_PAGES | typeof GUEST_PAGES | typeof DASHBOARD_PAGES)[number][1] | "demo";

// Aucune donnée du client n'est lue : l'assistant ne connaît que le
// catalogue, la FAQ et le plan du site. Une question ne part chez OpenAI
// qu'après la limite par IP.
export async function askAssistant(history: unknown, area: ChatArea): Promise<ActionResult<AssistantAnswer>> {
  return runAction(async () => {
    // Le layout masque l'assistant en mode liste d'attente ; l'action, elle,
    // reste appelable directement : elle refuse aussi.
    if (isWaitlistMode()) throw actionError("assistantUnavailable");
    const turns = sanitizeHistory(history);
    if (!turns) throw actionError("assistantInvalidQuestion");
    if (!(await checkRateLimit("assistant-chat", await getClientIp(), "10 m", 20))) {
      throw actionError("assistantRateLimited");
    }

    const [session, services, tPages, faq] = await Promise.all([
      getSession(),
      getCatalog(),
      getTranslations("AssistantChat.pages"),
      getFaqs(),
    ]);
    const signedIn = Boolean(session);
    const page = (key: PageKey) => ({ label: tPages(`${key}.label`), hint: tPages(`${key}.hint`) });

    const destinations: Destination[] = [
      ...PUBLIC_PAGES.map(([href, key]) => ({ href, ...page(key) })),
      ...(isDemoCallAvailable() ? [{ href: "/#essai", ...page("demo") }] : []),
      ...services.map((service) => ({
        href: `/services/${service.slug}`,
        label: service.name,
        hint: tPages("service.hint"),
      })),
      ...getTrades().map((trade) => ({
        href: tradePath(trade.slug),
        label: trade.name,
        hint: tPages("trade.hint", { audience: trade.audience }),
      })),
      ...(signedIn
        ? [
            ...DASHBOARD_PAGES.map(([href, key]) => ({ href, ...page(key) })),
            ...services.map((service) => ({
              href: `/dashboard/services/activate/${service.slug}`,
              label: tPages("activate.label", { name: service.name }),
              hint: tPages("activate.hint"),
            })),
          ]
        : GUEST_PAGES.map(([href, key]) => ({ href, ...page(key) }))),
    ];

    const prompt = buildAssistantPrompt({
      area: signedIn ? area : "public",
      signedIn,
      services: services.map((service) => ({
        name: service.name,
        description: service.description,
        price: formatPrice(service.monthlyPriceCents),
        usage: service.usageCap ? formatUsageCap(service.usageCap) : null,
        href: `/services/${service.slug}`,
      })),
      faq,
      destinations,
    });

    const completion = await getOpenAIClient()
      .chat.completions.create({
        model: CHAT_MODEL,
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        reasoning_effort: "low",
        messages: [
          { role: "system", content: prompt },
          ...turns.map((turn) => ({ role: turn.role, content: turn.text })),
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "assistant_answer", strict: true, schema: ASSISTANT_RESPONSE_SCHEMA },
        },
      }, { timeout: OPENAI_TIMEOUT_MS, maxRetries: 0 })
      .catch((err: unknown) => {
        console.error("[assistant-chat] OpenAI indisponible :", err);
        throw actionError("assistantUnavailable");
      });

    const answer = parseAssistantOutput(completion.choices[0]?.message.content, destinations);
    if (!answer) throw actionError("assistantUnavailable");
    return answer;
  });
}
