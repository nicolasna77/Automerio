import { getOpenAIClient } from "@/lib/openai";
import { db } from "@/lib/db";
import { createCalendarEvent, isSlotFree } from "@/lib/google-calendar";
import { asRuleRows, asStringArray, type Configuration } from "@/lib/catalog";
import { countCatalogItems, readProductCatalog } from "@/lib/product-catalog";


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

const BOOK_APPOINTMENT: ToolDefinition = {
  type: "function",
  function: {
    name: "book_appointment",
    description:
      "Réserve un rendez-vous dans l'agenda une fois le créneau confirmé libre et les informations de l'appelant recueillies.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        startAt: { type: "string", description: "Format ISO 8601." },
        durationMinutes: { type: "number" },
        notes: { type: "string", description: "Motif du rendez-vous." },
      },
      required: ["customerName", "customerPhone", "startAt", "durationMinutes"],
    },
  },
};

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

export function getToolDefinitions(
  serviceSlug: string,
  configuration: Configuration,
  calendarConnected: boolean
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
    tools.push(CHECK_AVAILABILITY, BOOK_APPOINTMENT);
  }
  if (objectives.includes("order")) {
    const hasCatalog = countCatalogItems(readProductCatalog(configuration.productCatalog)) > 0;
    tools.push(hasCatalog ? TAKE_ORDER : TAKE_MESSAGE);
  }
  return tools;
}

type OrderItem = { name: string; quantity: number };

export type ToolContext = {
  clientServiceId: string;
  callId: string | null;
  configuration: Configuration;
};

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<string> {
  switch (name) {
    case "check_availability": {
      const startAt = new Date(args.startAt as string);
      const durationMinutes = Number(args.durationMinutes);
      const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
      const free = await isSlotFree(context.clientServiceId, startAt, endAt);
      return free
        ? "Le créneau est libre."
        : "Le créneau n'est pas disponible (ou l'agenda n'a pas pu être consulté) — propose un autre horaire.";
    }

    case "book_appointment": {
      const customerName = String(args.customerName ?? "");
      const customerPhone = String(args.customerPhone ?? "");
      const startAt = new Date(args.startAt as string);
      const durationMinutes = Number(args.durationMinutes);
      const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
      const notes = typeof args.notes === "string" ? args.notes : null;

      const googleEventId = await createCalendarEvent(context.clientServiceId, {
        summary: `RDV — ${customerName}`,
        description: notes ?? undefined,
        startAt,
        endAt,
      });

      await db.booking.create({
        data: {
          clientServiceId: context.clientServiceId,
          kind: "appointment",
          customerName,
          customerPhone,
          startAt,
          endAt,
          googleEventId,
          notes,
        },
      });

      return googleEventId
        ? "Rendez-vous confirmé et ajouté à l'agenda."
        : "Rendez-vous enregistré, mais l'ajout à l'agenda a échoué — l'équipe le synchronisera manuellement.";
    }

    case "take_order": {
      const customerName = String(args.customerName ?? "");
      const customerPhone = String(args.customerPhone ?? "");
      const items = (Array.isArray(args.items) ? args.items : []) as OrderItem[];
      const fulfillment = args.fulfillment === "delivery" ? "delivery" : "pickup";
      const address = typeof args.address === "string" ? args.address : null;
      const notes = typeof args.notes === "string" ? args.notes : null;

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
      const reason = String(args.reason ?? "");
      const rules = asRuleRows(context.configuration.callRouting);
      const target = rules.find((r) => r.trigger === reason)?.target;
      if (!target) {
        return "Aucun numéro de transfert n'est configuré pour ce motif — propose de prendre un message à la place.";
      }
      if (!context.callId) {
        return `Transfert simulé vers ${target} (motif : « ${reason} »).`;
      }
      try {
        await getOpenAIClient().realtime.calls.refer(context.callId, { target_uri: `tel:${target}` });
        return `Appel transféré vers ${target}.`;
      } catch {
        return "Le transfert a échoué — propose de prendre un message à la place.";
      }
    }

    case "take_message": {
      const customerName = String(args.customerName ?? "");
      const customerPhone = String(args.customerPhone ?? "");
      const reason = typeof args.reason === "string" ? args.reason : null;

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
