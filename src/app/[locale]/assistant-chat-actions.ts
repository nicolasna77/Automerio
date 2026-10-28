"use server";

import type OpenAI from "openai";
import { getTranslations } from "next-intl/server";
import { getOpenAIClient } from "@/lib/openai";
import { getCatalog } from "@/lib/get-catalog";
import { getSession } from "@/lib/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { findInvalidWeeklyHours, formatCents, formatPrice, type ServiceDTO } from "@/lib/catalog";
import { formatUsageCap } from "@/lib/usage-cap";
import { getTrades, tradePath } from "@/lib/trades";
import { isDemoCallAvailable } from "@/lib/demo-call";
import { getFaqs } from "@/lib/site-metadata";
import { isWaitlistMode } from "@/lib/launch-mode";
import { actionError, runAction } from "@/lib/run-action";
import type { ActionResult } from "@/lib/action-result";
import { db } from "@/lib/db";
import { isOrganizationManager } from "@/lib/organization-roles";
import { validatePromoCodeForService } from "@/lib/stripe-promo-codes";
import { applyDiscount, describeDiscount } from "@/lib/promo-codes";
import { parseToolArguments } from "@/lib/messaging-agent";
import { activateService } from "@/app/[locale]/dashboard/actions";
import { settingsHiddenKeys } from "@/app/[locale]/dashboard/field-categories";
import {
  ACTIVATION_TOOLS,
  activationFields,
  coerceConfiguration,
  RECAP_QUESTION,
  confirmsRecap,
  describeActivationForm,
  monthlyPriceFor,
  readUnits,
} from "@/lib/assistant-activation";
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
// Une réponse ou un appel d'outil (réglages compris) tient largement dans ce
// plafond : il borne le coût d'une question piégée.
const MAX_COMPLETION_TOKENS = 2000;
const OPENAI_TIMEOUT_MS = 20_000;
// Tours d'outils par question : formulaire, organisations, prix, activation.
const MAX_TOOL_ROUNDS = 4;

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

// Sans compte, l'assistant ne connaît que le catalogue, la FAQ et le plan du
// site. Connecté, il lit en plus les organisations de l'utilisateur et peut
// activer une solution par activateService, qui refait tous les contrôles.
// Une question ne part chez OpenAI qu'après la limite par IP.
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
        slug: service.slug,
        name: service.name,
        description: service.description,
        price: formatPrice(service.monthlyPriceCents),
        usage: service.usageCap ? formatUsageCap(service.usageCap) : null,
        href: `/services/${service.slug}`,
      })),
      faq,
      destinations,
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: prompt },
      ...turns.map((turn) => ({ role: turn.role, content: turn.text })),
    ];
    const tools = session ? new ActivationTools(session.user.id, services, confirmsRecap(turns)) : null;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      // Chaque tour d'outil est un appel OpenAI de plus : il compte aussi,
      // par utilisateur, pour qu'une question ne coûte pas cinq fois plus.
      if (round > 0 && session && !(await checkRateLimit("assistant-chat-tools", session.user.id, "10 m", 40))) {
        throw actionError("assistantRateLimited");
      }
      const completion = await getOpenAIClient()
        .chat.completions.create(
          {
            model: CHAT_MODEL,
            max_completion_tokens: MAX_COMPLETION_TOKENS,
            reasoning_effort: "low",
            messages,
            // Dernier tour : plus d'outil, le modèle doit répondre.
            ...(tools && round < MAX_TOOL_ROUNDS ? { tools: ACTIVATION_TOOLS } : {}),
            response_format: {
              type: "json_schema",
              json_schema: { name: "assistant_answer", strict: true, schema: ASSISTANT_RESPONSE_SCHEMA },
            },
          },
          { timeout: OPENAI_TIMEOUT_MS, maxRetries: 0 }
        )
        .catch((err: unknown) => {
          console.error("[assistant-chat] OpenAI indisponible :", err);
          throw actionError("assistantUnavailable");
        });

      const message = completion.choices[0]?.message;
      const calls = (message?.tool_calls ?? []).filter((call) => call.type === "function");
      if (!message || !tools || calls.length === 0) {
        const answer = parseAssistantOutput(message?.content, destinations);
        if (!answer) throw actionError("assistantUnavailable");
        return answer;
      }

      // Seuls les appels de fonction reçoivent une réponse : les autres sont
      // retirés du message, sans quoi OpenAI refuse le tour suivant.
      messages.push({ ...message, tool_calls: calls });
      for (const call of calls) {
        const outcome = await tools.run(call.function.name, parseToolArguments(call.function.arguments));
        // Solution créée : la réponse est écrite par le serveur, avec les prix
        // calculés ici, et le panneau ouvre aussitôt le paiement.
        if (isActivated(outcome)) return { reply: outcome.reply, links: [], checkoutUrl: outcome.checkoutUrl };
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(outcome) });
      }
    }
    throw actionError("assistantUnavailable");
  });
}

type Activated = { checkoutUrl: string; reply: string };

function isActivated(outcome: object): outcome is Activated {
  return "checkoutUrl" in outcome;
}

// Outils de l'activation. Le modèle ne fait que proposer des valeurs : prix,
// droits et champs obligatoires sont décidés ici et dans activateService.
class ActivationTools {
  // Une seule tentative par question : après une erreur, le modèle doit
  // redemander à l'utilisateur, pas réessayer avec des valeurs inventées.
  private activationAttempted = false;
  private organizations: Promise<{ id: string; name: string; canActivate: boolean }[]> | null = null;

  constructor(
    private readonly userId: string,
    private readonly services: ServiceDTO[],
    // Le dernier message répond « oui » au récapitulatif (confirmsRecap).
    private readonly recapConfirmed: boolean
  ) {}

  async run(name: string, args: Record<string, unknown>): Promise<object> {
    switch (name) {
      case "list_my_organizations":
        return { organizations: await this.listOrganizations() };
      case "get_activation_form":
        return this.form(args);
      case "quote_price":
        return this.quote(args);
      case "activate_service":
        return this.activate(args);
      default:
        return { error: "Outil inconnu." };
    }
  }

  // Catalogue actif seulement : une solution retirée n'est jamais proposée.
  private service(slug: unknown): ServiceDTO | null {
    return this.services.find((service) => service.slug === slug) ?? null;
  }

  // Seules les organisations dont l'utilisateur est membre, lues une fois par
  // question.
  private listOrganizations() {
    this.organizations ??= db.member
      .findMany({
        where: { userId: this.userId },
        select: { role: true, organization: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      })
      .then((memberships) =>
        memberships.map(({ role, organization }) => ({
          id: organization.id,
          name: organization.name,
          canActivate: isOrganizationManager(role),
        }))
      );
    return this.organizations;
  }

  private form(args: Record<string, unknown>) {
    const service = this.service(args.slug);
    if (!service) return { error: "Solution inconnue ou indisponible : choisis un slug du catalogue." };
    return describeActivationForm(service, activationFields(service, settingsHiddenKeys(service.slug)));
  }

  // Mêmes calculs que l'écran d'activation : prix du volume, puis remise.
  private async pricing(service: ServiceDTO, units: number | null, promoCode: unknown) {
    const monthly = monthlyPriceFor(service, units);
    if (monthly === null) return { error: "Volume non proposé : respecte min, max et step du formulaire." };
    const code = typeof promoCode === "string" ? promoCode.trim() : "";
    if (!code) return { monthly, today: monthly, promo: null, discount: null };
    const result = await validatePromoCodeForService(code, service.slug);
    if (!result.ok) {
      const t = await getTranslations("Actions");
      return { error: t(result.key) };
    }
    // La remise peut durer un paiement, quelques mois ou toujours : on la
    // décrit avec le texte de l'écran, plutôt que d'annoncer un seul prix.
    return {
      monthly,
      today: applyDiscount(monthly, result.rule),
      promo: result.code,
      discount: describeDiscount(result.rule, await getTranslations("Discount")),
    };
  }

  private async quote(args: Record<string, unknown>) {
    const service = this.service(args.slug);
    if (!service) return { error: "Solution inconnue ou indisponible." };
    const price = await this.pricing(service, readUnits(args.units), args.promoCode);
    if ("error" in price) return price;
    return {
      monthlyPrice: formatCents(price.monthly),
      payToday: formatCents(price.today),
      promoCode: price.promo,
      discount: price.discount,
      note: "Prix TTC, sans engagement.",
    };
  }

  private async activate(args: Record<string, unknown>): Promise<object> {
    if (!this.recapConfirmed) {
      return {
        error: `Pas d'accord au récapitulatif. Envoie le récapitulatif seul, termine par « ${RECAP_QUESTION} », et attends un « oui ».`,
      };
    }
    if (this.activationAttempted) {
      return { error: "Une seule tentative par message : explique l'erreur précédente et redemande la valeur à l'utilisateur." };
    }
    this.activationAttempted = true;

    const service = this.service(args.slug);
    if (!service) return { error: "Solution inconnue ou indisponible." };
    const fields = activationFields(service, settingsHiddenKeys(service.slug));
    const configuration = coerceConfiguration(fields, args.configuration);
    const badHours = findInvalidWeeklyHours(fields, configuration);
    if (badHours) {
      const t = await getTranslations("Dashboard.activation");
      return { error: t("invalidHours", { label: badHours.label }) };
    }

    const units = service.tier ? readUnits(args.units) : null;
    const price = await this.pricing(service, units, args.promoCode);
    if ("error" in price) return price;

    const organizationId = typeof args.organizationId === "string" ? args.organizationId : "";
    const organization = (await this.listOrganizations()).find((org) => org.id === organizationId);
    if (!organization) return { error: "Organisation inconnue : utilise un id de list_my_organizations." };

    const name = typeof args.name === "string" ? args.name : "";
    // Droits, solution active, nom unique, champs obligatoires et prix lu en
    // base : tout est revérifié par l'action de l'écran d'activation.
    const result = await activateService(service.id, organizationId, name, configuration, price.promo, units);
    if (!result.ok) return { error: result.error };

    const t = await getTranslations("AssistantChat.activation");
    const values = {
      name: name.trim(),
      service: service.name,
      organization: organization.name,
      monthly: formatCents(price.monthly),
      today: formatCents(price.today),
    };
    return {
      checkoutUrl: result.data.checkoutUrl,
      reply:
        price.promo && price.discount
          ? t("createdWithPromo", { ...values, code: price.promo, discount: price.discount })
          : t("created", values),
    } satisfies Activated;
  }
}
