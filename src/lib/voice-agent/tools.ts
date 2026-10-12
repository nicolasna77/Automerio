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
  validateQuote,
  validateSlot,
} from "@/lib/voice-agent/tool-args";
import { sendAppointmentChangeSms, sendBookingConfirmationSms } from "@/lib/booking-sms";
import { normalizeFrenchPhone } from "@/lib/demo-call";
import { deliverWebhook } from "@/lib/outgoing-webhook";


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

// Annuler ou déplacer un rendez-vous : l'agent ne voit que les rendez-vous
// à venir pris au numéro qui appelle (en-tête SIP), jamais un numéro dicté.
const FIND_MY_APPOINTMENTS: ToolDefinition = {
  type: "function",
  function: {
    name: "find_my_appointments",
    description:
      "Liste les rendez-vous à venir pris au numéro qui appelle, avant de les annuler ou de les déplacer.",
    parameters: { type: "object", properties: {} },
  },
};

const CANCEL_APPOINTMENT: ToolDefinition = {
  type: "function",
  function: {
    name: "cancel_appointment",
    description:
      "Annule un rendez-vous de l'appelant, après lui avoir relu la date et l'heure et obtenu son accord.",
    parameters: {
      type: "object",
      properties: {
        appointmentId: { type: "string", description: "Identifiant donné par find_my_appointments." },
      },
      required: ["appointmentId"],
    },
  },
};

const RESCHEDULE_APPOINTMENT: ToolDefinition = {
  type: "function",
  function: {
    name: "reschedule_appointment",
    description:
      "Déplace un rendez-vous de l'appelant vers un nouveau créneau, vérifié libre avec check_availability et accepté par l'appelant.",
    parameters: {
      type: "object",
      properties: {
        appointmentId: { type: "string", description: "Identifiant donné par find_my_appointments." },
        newStartAt: { type: "string", description: "Nouveau début, au format ISO 8601." },
      },
      required: ["appointmentId", "newStartAt"],
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

const TAKE_QUOTE_REQUEST: ToolDefinition = {
  type: "function",
  function: {
    name: "take_quote_request",
    description:
      "Enregistre une demande de devis : nature des travaux, adresse du chantier, urgence et créneau souhaité pour la visite. Aucun prix n'est donné.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        workType: { type: "string", description: "Nature des travaux, en quelques mots (ex. « Remplacement chauffe-eau »)." },
        address: { type: "string", description: "Adresse du chantier." },
        urgent: { type: "boolean", description: "true si l'intervention est urgente." },
        preferredSlot: { type: "string", description: "Créneau souhaité pour la visite, tel que dit par l'appelant." },
        details: { type: "string", description: "Précisions utiles au chiffrage." },
      },
      required: ["customerName", "customerPhone", "workType"],
    },
  },
};

// Réglage « Demandes de devis » du standard téléphonique.
export function takesQuoteRequests(configuration: Configuration): boolean {
  return configuration.quoteRequests === "on";
}

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
    if (takesQuoteRequests(configuration)) tools.push(TAKE_QUOTE_REQUEST);
    return tools;
  }

  const objectives = objectivesOf(configuration);
  const tools: ToolDefinition[] = [];
  if (objectives.includes("appointment") && calendarConnected) {
    tools.push(
      CHECK_AVAILABILITY,
      buildBookAppointmentTool(collectsEmail),
      FIND_MY_APPOINTMENTS,
      CANCEL_APPOINTMENT,
      RESCHEDULE_APPOINTMENT
    );
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
export const MAX_CHANGES_PER_SESSION = 3;

// Une session = un appel ou une conversation. Elle garde les outils réellement
// proposés au modèle, seuls exécutables, et compte les écritures.
export type ToolSession = {
  allowedTools: ReadonlySet<string>;
  bookings: number;
  records: number;
  changes: number;
};

export function createToolSession(tools: ToolDefinition[]): ToolSession {
  return {
    allowedTools: new Set(tools.map((tool) => tool.function.name)),
    bookings: 0,
    records: 0,
    changes: 0,
  };
}

export type ToolContext = {
  clientServiceId: string;
  callId: string | null;
  configuration: Configuration;
  session: ToolSession;
  testMode?: boolean;
  // Numéro qui appelle (en-tête SIP From, E.164), seul moyen de retrouver
  // les rendez-vous de l'appelant ; null en messagerie et pour un numéro masqué.
  callerNumber?: string | null;
};

const BOOKING_CAP_REACHED = `Limite atteinte : pas plus de ${MAX_BOOKINGS_PER_SESSION} rendez-vous par échange. N'en réserve pas d'autre ; propose de noter la demande, l'entreprise rappellera.`;
const CHANGE_CAP_REACHED = `Limite atteinte : pas plus de ${MAX_CHANGES_PER_SESSION} annulations ou déplacements par appel. Propose de noter la demande, l'entreprise rappellera.`;
const CALLER_UNKNOWN =
  "Le numéro de l'appelant est masqué ou inconnu : tu ne peux pas retrouver ses rendez-vous. Propose de noter sa demande, l'entreprise rappellera.";
const APPOINTMENT_NOT_FOUND =
  "Ce rendez-vous n'existe pas ou n'a pas été pris avec ce numéro. Relance find_my_appointments, ou propose de noter la demande.";

const PARIS_LABEL = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

type CallerAppointment = {
  id: string;
  customerName: string;
  customerPhone: string;
  startAt: Date;
  endAt: Date | null;
  notes: string | null;
  googleEventId: string | null;
  externalBookingId: string | null;
};

// Rendez-vous à venir de la solution dont le téléphone, dicté à la prise de
// rendez-vous, correspond au numéro qui appelle.
export async function callerAppointments(
  clientServiceId: string,
  callerNumber: string,
  now: Date = new Date()
): Promise<CallerAppointment[]> {
  const rows = await db.booking.findMany({
    where: { clientServiceId, kind: "appointment", startAt: { gt: now } },
    orderBy: { startAt: "asc" },
    take: 50,
    select: {
      id: true,
      customerName: true,
      customerPhone: true,
      startAt: true,
      endAt: true,
      notes: true,
      googleEventId: true,
      externalBookingId: true,
    },
  });
  return rows.filter(
    (row): row is CallerAppointment =>
      row.startAt !== null && normalizeFrenchPhone(row.customerPhone) === callerNumber
  );
}

const RECORD_CAP_REACHED = `Limite atteinte : pas plus de ${MAX_RECORDS_PER_SESSION} commandes ou messages par échange. N'en enregistre pas d'autre ; indique que l'entreprise reviendra vers la personne.`;

// Webhook sortant du client (Zapier, Make, CRM) : chaque réservation créée.
function announceBooking(
  context: ToolContext,
  booking: { id: string; kind: string; customerName: string; customerPhone: string; startAt: Date | null; endAt: Date | null; notes: string | null; metadata: unknown }
): void {
  void deliverWebhook(context.clientServiceId, "booking.created", {
    bookingId: booking.id,
    kind: booking.kind,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    startAt: booking.startAt?.toISOString() ?? null,
    endAt: booking.endAt?.toISOString() ?? null,
    notes: booking.notes,
    details: booking.metadata ?? null,
    channel: context.callId ? "phone" : "messaging",
  });
}

// SMS de confirmation à l'appelant, seulement pendant un vrai appel : pas
// d'appel d'essai, et en messagerie la confirmation est déjà écrite dans la
// conversation. Sans attente : l'agent répond pendant que le SMS part.
function confirmBySms(
  context: ToolContext,
  booking: { kind: "appointment" | "order" | "quote"; customerPhone: string; startAt?: Date; workType?: string }
): void {
  if (!context.callId || context.testMode) return;
  void sendBookingConfirmationSms({ clientServiceId: context.clientServiceId, ...booking }).catch((err) =>
    console.error("[sms] confirmation impossible :", err)
  );
}

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

      const created = await db.booking.create({
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
      announceBooking(context, created);
      confirmBySms(context, { kind: "appointment", customerPhone, startAt });

      return result
        ? "Rendez-vous confirmé et ajouté à l'agenda."
        : "Rendez-vous noté, mais l'ajout à l'agenda a échoué : l'entreprise le confirmera elle-même.";
    }

    case "find_my_appointments": {
      if (!context.callerNumber) return CALLER_UNKNOWN;
      if (context.testMode) {
        return "Appel d'essai : aucun rendez-vous réel n'est consulté. Explique qu'en situation réelle, tu retrouverais les rendez-vous pris à ce numéro.";
      }
      const appointments = await callerAppointments(context.clientServiceId, context.callerNumber);
      if (appointments.length === 0) {
        return "Aucun rendez-vous à venir n'a été pris avec ce numéro. Si l'appelant l'a pris avec un autre numéro, propose de noter sa demande.";
      }
      return [
        "Rendez-vous à venir pris avec ce numéro :",
        ...appointments.map(
          (a) => `- ${PARIS_LABEL.format(a.startAt)}, au nom de ${a.customerName}${a.notes ? ` (${a.notes})` : ""} : identifiant ${a.id}`
        ),
      ].join("\n");
    }

    case "cancel_appointment": {
      if (!context.callerNumber) return CALLER_UNKNOWN;
      if (context.session.changes >= MAX_CHANGES_PER_SESSION) return CHANGE_CAP_REACHED;
      if (context.testMode) return "Appel d'essai : le rendez-vous serait maintenant annulé et l'appelant prévenu par SMS.";
      const appointmentId = boundedString(args.appointmentId, 64);
      const appointment = (await callerAppointments(context.clientServiceId, context.callerNumber)).find(
        (a) => a.id === appointmentId
      );
      if (!appointment) return APPOINTMENT_NOT_FOUND;
      context.session.changes += 1;

      const scheduler = await getScheduler(context.clientServiceId);
      const removed = scheduler ? await scheduler.cancel(appointment) : false;
      if (!removed) {
        return "L'agenda n'a pas pu annuler ce rendez-vous. Ne le présente pas comme annulé : propose de noter la demande, l'entreprise s'en chargera.";
      }
      await db.booking.delete({ where: { id: appointment.id } });
      void deliverWebhook(context.clientServiceId, "booking.canceled", {
        bookingId: appointment.id,
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        startAt: appointment.startAt.toISOString(),
        channel: "phone",
      });
      void sendAppointmentChangeSms({
        clientServiceId: context.clientServiceId,
        change: "canceled",
        customerPhone: appointment.customerPhone,
        startAt: appointment.startAt,
      }).catch((err) => console.error("[sms] annulation impossible :", err));
      return `Rendez-vous du ${PARIS_LABEL.format(appointment.startAt)} annulé. L'appelant reçoit une confirmation par SMS.`;
    }

    case "reschedule_appointment": {
      if (!context.callerNumber) return CALLER_UNKNOWN;
      if (context.session.changes >= MAX_CHANGES_PER_SESSION) return CHANGE_CAP_REACHED;
      if (context.testMode) return "Appel d'essai : le rendez-vous serait maintenant déplacé et l'appelant prévenu par SMS.";
      const appointmentId = boundedString(args.appointmentId, 64);
      const appointment = (await callerAppointments(context.clientServiceId, context.callerNumber)).find(
        (a) => a.id === appointmentId
      );
      if (!appointment) return APPOINTMENT_NOT_FOUND;
      const scheduler = await getScheduler(context.clientServiceId);

      // Même durée qu'avant, sauf durée imposée par l'agenda.
      const previousMinutes = appointment.endAt
        ? Math.round((appointment.endAt.getTime() - appointment.startAt.getTime()) / 60_000)
        : null;
      const slot = validateSlot({
        startAt: args.newStartAt,
        durationMinutes: scheduler?.fixedDurationMinutes ?? previousMinutes ?? 30,
      });
      if (!slot.ok) return slot.error;
      if (!scheduler || !(await scheduler.isSlotFree(slot.value.startAt, slot.value.durationMinutes))) {
        return "Ce nouveau créneau n'est pas disponible : propose un autre horaire.";
      }
      context.session.changes += 1;

      // Le nouveau créneau d'abord : si l'agenda le refuse, l'ancien reste valable.
      const result = await scheduler.book({
        startAt: slot.value.startAt,
        durationMinutes: slot.value.durationMinutes,
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        customerEmail: null,
        notes: appointment.notes,
      });
      if (!result) {
        return "L'agenda a refusé le nouveau créneau : le rendez-vous reste à son horaire actuel. Propose un autre horaire.";
      }
      const released = await scheduler.cancel(appointment);
      if (!released) {
        console.error(`[agenda] ancien créneau non libéré pour le rendez-vous ${appointment.id}`);
      }
      const endAt = new Date(slot.value.startAt.getTime() + slot.value.durationMinutes * 60_000);
      await db.booking.update({
        where: { id: appointment.id },
        data: {
          startAt: slot.value.startAt,
          endAt,
          googleEventId: result.googleEventId ?? null,
          externalBookingId: result.externalBookingId ?? null,
          // Nouveau rendez-vous, nouveau rappel la veille.
          reminderSentAt: null,
        },
      });
      void deliverWebhook(context.clientServiceId, "booking.rescheduled", {
        bookingId: appointment.id,
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        previousStartAt: appointment.startAt.toISOString(),
        startAt: slot.value.startAt.toISOString(),
        endAt: endAt.toISOString(),
        channel: "phone",
      });
      void sendAppointmentChangeSms({
        clientServiceId: context.clientServiceId,
        change: "moved",
        customerPhone: appointment.customerPhone,
        startAt: slot.value.startAt,
      }).catch((err) => console.error("[sms] déplacement impossible :", err));
      return released
        ? `Rendez-vous déplacé au ${PARIS_LABEL.format(slot.value.startAt)}. L'appelant reçoit une confirmation par SMS.`
        : `Rendez-vous déplacé au ${PARIS_LABEL.format(slot.value.startAt)}, mais l'ancien créneau n'a pas pu être libéré dans l'agenda : l'entreprise le fera.`;
    }

    case "take_order": {
      if (context.session.records >= MAX_RECORDS_PER_SESSION) return RECORD_CAP_REACHED;
      const order = validateOrder(args);
      if (!order.ok) return order.error;
      context.session.records += 1;
      if (context.testMode) return "Commande enregistrée.";

      const { customerName, customerPhone, items, fulfillment, address, notes } = order.value;
      const created = await db.booking.create({
        data: {
          clientServiceId: context.clientServiceId,
          kind: "order",
          customerName,
          customerPhone,
          notes,
          metadata: { items, fulfillment, address },
        },
      });
      announceBooking(context, created);
      confirmBySms(context, { kind: "order", customerPhone });

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
      const created = await db.booking.create({
        data: {
          clientServiceId: context.clientServiceId,
          kind: "message",
          customerName,
          customerPhone,
          notes: reason,
        },
      });
      announceBooking(context, created);

      return "Message enregistré, l'entreprise rappellera.";
    }

    case "take_quote_request": {
      if (context.session.records >= MAX_RECORDS_PER_SESSION) return RECORD_CAP_REACHED;
      const quote = validateQuote(args);
      if (!quote.ok) return quote.error;
      context.session.records += 1;
      if (context.testMode) return "Demande de devis enregistrée, l'entreprise rappellera.";

      const { customerName, customerPhone, workType, address, urgent, preferredSlot, details } = quote.value;
      const created = await db.booking.create({
        data: {
          clientServiceId: context.clientServiceId,
          kind: "quote",
          customerName,
          customerPhone,
          notes: details,
          // callId : la demande s'affiche dans le détail de son appel.
          metadata: { callId: context.callId, workType, address, urgent, preferredSlot },
        },
      });
      announceBooking(context, created);
      confirmBySms(context, { kind: "quote", customerPhone, workType });

      return "Demande de devis enregistrée, l'entreprise rappellera.";
    }

    default:
      return `Tool inconnu : ${name}.`;
  }
}
