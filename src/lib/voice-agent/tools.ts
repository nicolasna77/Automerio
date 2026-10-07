import { getOpenAIClient } from "@/lib/openai";
import { db } from "@/lib/db";
import { getScheduler } from "@/lib/scheduling";
import { asRuleRows, asStringArray, type Configuration } from "@/lib/catalog";
import { countCatalogItems, readProductCatalog } from "@/lib/product-catalog";
import {
  LIMITS,
  boundedString,
  validateBooking,
  validateMessage,
  validateOrder,
  validateSlot,
} from "@/lib/voice-agent/tool-args";


export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type RealtimeToolDefinition = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export function toRealtimeTools(tools: ToolDefinition[]): RealtimeToolDefinition[] {
  return tools.map((tool) => ({
    type: "function",
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
  }));
}

function objectivesOf(configuration: Configuration): string[] {
  return asStringArray(configuration.objectives);
}

const CHECK_AVAILABILITY: ToolDefinition = {
  type: "function",
  function: {
    name: "check_availability",
    description:
      "Vérifie si un créneau est libre dans l'agenda avant de proposer un rendez-vous.",
    parameters: {
      type: "object",
      properties: {
        startAt: {
          type: "string",
          description: "Début du créneau, au format ISO 8601 (ex. 2026-09-15T14:00:00+02:00).",
        },
        durationMinutes: { type: "number", description: "Durée du créneau en minutes." },
      },
      required: ["startAt", "durationMinutes"],
    },
  },
};

const BOOKING_PROPERTIES = {
  customerName: { type: "string" },
  customerPhone: { type: "string" },
  startAt: { type: "string", description: "Format ISO 8601." },
  durationMinutes: { type: "number" },
  notes: { type: "string", description: "Motif du rendez-vous." },
};

function buildBookAppointmentTool(collectsEmail: boolean): ToolDefinition {
  return {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "Réserve un rendez-vous dans l'agenda une fois le créneau confirmé libre et les informations de l'appelant recueillies.",
      parameters: {
        type: "object",
        properties: collectsEmail
          ? {
              ...BOOKING_PROPERTIES,
              customerEmail: {
                type: "string",
                description:
                  "Adresse e-mail de l'appelant, seulement s'il souhaite recevoir la confirmation. Facultatif.",
              },
            }
          : BOOKING_PROPERTIES,
        required: ["customerName", "customerPhone", "startAt", "durationMinutes"],
      },
    },
  };
}

const TAKE_ORDER: ToolDefinition = {
  type: "function",
  function: {
    name: "take_order",
    description: "Enregistre une commande une fois les articles et le mode de retrait confirmés.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "number" },
            },
            required: ["name", "quantity"],
          },
        },
        fulfillment: { type: "string", enum: ["pickup", "delivery"] },
        address: { type: "string", description: "Requis si fulfillment = delivery." },
        notes: { type: "string" },
      },
      required: ["customerName", "customerPhone", "items", "fulfillment"],
    },
  },
};

function buildTransferCallTool(triggers: string[]): ToolDefinition {
  return {
    type: "function",
    function: {
      name: "transfer_call",
      description: "Transfère l'appel en cours vers le bon interlocuteur selon le motif de l'appel.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", enum: triggers, description: "Motif du transfert." },
        },
        required: ["reason"],
      },
    },
  };
}

const TAKE_MESSAGE: ToolDefinition = {
  type: "function",
  function: {
    name: "take_message",
    description:
      "Note un message pour l'entreprise quand l'appel ne correspond à aucun motif de transfert connu, ou en dehors des horaires d'ouverture.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        reason: { type: "string", description: "Motif de l'appel, en une phrase." },
      },
      required: ["customerName", "customerPhone", "reason"],
    },
  },
};

// collectsEmail : l'agenda (Cal.com, Calendly) envoie une confirmation par
// e-mail, l'agent peut donc proposer à l'appelant de donner son adresse.
export function getToolDefinitions(
  serviceSlug: string,
  configuration: Configuration,
  calendarConnected: boolean,
  collectsEmail = false
): ToolDefinition[] {
  if (serviceSlug === "standard-telephonique-ia") {
    const tools: ToolDefinition[] = [];
    const triggers = asRuleRows(configuration.callRouting).map((r) => r.trigger);
    if (triggers.length > 0) tools.push(buildTransferCallTool(triggers));
    tools.push(TAKE_MESSAGE);
    return tools;
  }

  const objectives = objectivesOf(configuration);
  const tools: ToolDefinition[] = [];
  if (objectives.includes("appointment") && calendarConnected) {
    tools.push(CHECK_AVAILABILITY, buildBookAppointmentTool(collectsEmail));
  }
  if (objectives.includes("order")) {
    const hasCatalog = countCatalogItems(readProductCatalog(configuration.productCatalog)) > 0;
    tools.push(hasCatalog ? TAKE_ORDER : TAKE_MESSAGE);
  }
  return tools;
}

// Plafonds par appel ou par conversation : un appelant ou un expéditeur qui
// manipule le modèle ne peut pas remplir l'agenda ni la liste des demandes.
export const MAX_BOOKINGS_PER_SESSION = 3;
export const MAX_RECORDS_PER_SESSION = 5;

// Une session = un appel ou une conversation. Elle garde les outils réellement
// proposés au modèle, seuls exécutables, et compte les écritures.
export type ToolSession = {
  allowedTools: ReadonlySet<string>;
  bookings: number;
  records: number;
};

export function createToolSession(tools: ToolDefinition[]): ToolSession {
  return {
    allowedTools: new Set(tools.map((tool) => tool.function.name)),
    bookings: 0,
    records: 0,
  };
}

export type ToolContext = {
  clientServiceId: string;
  callId: string | null;
  configuration: Configuration;
  session: ToolSession;
  testMode?: boolean;
};

const BOOKING_CAP_REACHED = `Limite atteinte : pas plus de ${MAX_BOOKINGS_PER_SESSION} rendez-vous par échange. N'en réserve pas d'autre ; propose de noter la demande, l'entreprise rappellera.`;
const RECORD_CAP_REACHED = `Limite atteinte : pas plus de ${MAX_RECORDS_PER_SESSION} commandes ou messages par échange. N'en enregistre pas d'autre ; indique que l'entreprise reviendra vers la personne.`;

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<string> {
  // Le modèle ne peut appeler que les outils qu'on lui a proposés pour cette
  // session : pas de prise de rendez-vous sans agenda, par exemple.
  if (!context.session.allowedTools.has(name)) {
    console.warn(`[agent] outil non proposé refusé : ${name} (solution ${context.clientServiceId}).`);
    return `L'outil ${name} n'est pas disponible ici. N'utilise que les outils proposés.`;
  }

  switch (name) {
    case "check_availability": {
      const slot = validateSlot(args);
      if (!slot.ok) return slot.error;
      const scheduler = await getScheduler(context.clientServiceId);
      const free = scheduler
        ? await scheduler.isSlotFree(slot.value.startAt, slot.value.durationMinutes)
        : false;
      if (free) {
        return scheduler?.fixedDurationMinutes
          ? `Le créneau est libre. Le rendez-vous dure ${scheduler.fixedDurationMinutes} minutes.`
          : "Le créneau est libre.";
      }
      return "Le créneau n'est pas disponible, ou l'agenda n'a pas pu être consulté : propose un autre horaire.";
    }

    case "book_appointment": {
      if (context.session.bookings >= MAX_BOOKINGS_PER_SESSION) return BOOKING_CAP_REACHED;
      const scheduler = await getScheduler(context.clientServiceId);
      // Une durée imposée par le type de rendez-vous prime sur celle de l'agent.
      const booking = validateBooking(args, scheduler?.fixedDurationMinutes ?? null);
      if (!booking.ok) return booking.error;
      // Revérifié après l'attente : des appels d'outils peuvent être parallèles.
      if (context.session.bookings >= MAX_BOOKINGS_PER_SESSION) return BOOKING_CAP_REACHED;
      context.session.bookings += 1;
      if (context.testMode) return "Rendez-vous confirmé et ajouté à l'agenda.";

      const { customerName, customerPhone, customerEmail, startAt, durationMinutes, notes } = booking.value;
      const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
      const result = scheduler
        ? await scheduler.book({
            startAt,
            durationMinutes,
            customerName,
            customerPhone,
            customerEmail,
            notes,
          })
        : null;

      await db.booking.create({
        data: {
          clientServiceId: context.clientServiceId,
          kind: "appointment",
          customerName,
          customerPhone,
          startAt,
          endAt,
          googleEventId: result?.googleEventId ?? null,
          externalBookingId: result?.externalBookingId ?? null,
          notes,
        },
      });

      return result
        ? "Rendez-vous confirmé et ajouté à l'agenda."
        : "Rendez-vous noté, mais l'ajout à l'agenda a échoué : l'entreprise le confirmera elle-même.";
    }

    case "take_order": {
      if (context.session.records >= MAX_RECORDS_PER_SESSION) return RECORD_CAP_REACHED;
      const order = validateOrder(args);
      if (!order.ok) return order.error;
      context.session.records += 1;
      if (context.testMode) return "Commande enregistrée.";

      const { customerName, customerPhone, items, fulfillment, address, notes } = order.value;
      await db.booking.create({
        data: {
          clientServiceId: context.clientServiceId,
          kind: "order",
          customerName,
          customerPhone,
          notes,
          metadata: { items, fulfillment, address },
        },
      });

      return "Commande enregistrée.";
    }

    case "transfer_call": {
      const reason = boundedString(args.reason, LIMITS.notes);
      const rules = asRuleRows(context.configuration.callRouting);
      const target = rules.find((r) => r.trigger === reason)?.target;
      if (!target) {
        return "Aucun numéro de transfert n'est configuré pour ce motif — propose de prendre un message à la place.";
      }
      if (!context.callId || context.testMode) {
        return `Transfert simulé vers ${target} (motif : « ${reason} »). Explique à l'appelant qu'en situation réelle, l'appel serait maintenant transféré.`;
      }
      try {
        await getOpenAIClient().realtime.calls.refer(context.callId, { target_uri: `tel:${target}` });
        return `Appel transféré vers ${target}.`;
      } catch {
        return "Le transfert a échoué — propose de prendre un message à la place.";
      }
    }

    case "take_message": {
      if (context.session.records >= MAX_RECORDS_PER_SESSION) return RECORD_CAP_REACHED;
      const message = validateMessage(args);
      if (!message.ok) return message.error;
      context.session.records += 1;
      if (context.testMode) return "Message enregistré, l'entreprise rappellera.";

      const { customerName, customerPhone, reason } = message.value;
      await db.booking.create({
        data: {
          clientServiceId: context.clientServiceId,
          kind: "message",
          customerName,
          customerPhone,
          notes: reason,
        },
      });

      return "Message enregistré, l'entreprise rappellera.";
    }

    default:
      return `Tool inconnu : ${name}.`;
  }
}
