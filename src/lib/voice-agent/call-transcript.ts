/**
 * La transcription d'un appel, reconstruite a partir des evenements Realtime.
 *
 * Les deux cotes n'arrivent pas dans l'ordre : la transcription de l'appelant
 * tourne sur un modele a part et peut aboutir apres la reponse de l'assistant.
 * On retient donc l'ordre d'apparition des elements de conversation
 * (`conversation.item.added`) et on range les textes dedans quand ils arrivent.
 */

export type Speaker = "caller" | "assistant";
export type TranscriptTurn = { speaker: Speaker; text: string };

type RealtimeEvent = {
  type?: string;
  item_id?: string;
  item?: { id?: string; role?: string };
  transcript?: string;
};

export class TranscriptCollector {
  private readonly order: string[] = [];
  private readonly speakers = new Map<string, Speaker>();
  private readonly texts = new Map<string, string>();

  private remember(itemId: string, speaker: Speaker) {
    if (!this.speakers.has(itemId)) {
      this.order.push(itemId);
      this.speakers.set(itemId, speaker);
    }
  }

  /** Rend `true` si l'evenement a ete pris en compte. */
  handle(event: RealtimeEvent): boolean {
    switch (event.type) {
      // Nom GA, puis nom de la beta : les deux circulent encore.
      case "conversation.item.added":
      case "conversation.item.created": {
        const id = event.item?.id;
        const role = event.item?.role;
        if (!id || (role !== "user" && role !== "assistant")) return false;
        this.remember(id, role === "user" ? "caller" : "assistant");
        return true;
      }
      case "conversation.item.input_audio_transcription.completed": {
        if (!event.item_id) return false;
        this.remember(event.item_id, "caller");
        this.texts.set(event.item_id, event.transcript ?? "");
        return true;
      }
      case "response.output_audio_transcript.done": {
        if (!event.item_id) return false;
        this.remember(event.item_id, "assistant");
        this.texts.set(event.item_id, event.transcript ?? "");
        return true;
      }
      default:
        return false;
    }
  }

  turns(): TranscriptTurn[] {
    return this.order
      .map((id) => ({ speaker: this.speakers.get(id)!, text: (this.texts.get(id) ?? "").trim() }))
      .filter((turn) => turn.text.length > 0);
  }
}

export type CallOutcome =
  | "appointment_booked"
  | "order_taken"
  | "transferred"
  | "message_taken"
  | "no_action";

/** Ce que l'appel a produit, du plus au moins engageant. */
const OUTCOME_PRIORITY: CallOutcome[] = [
  "appointment_booked",
  "order_taken",
  "transferred",
  "message_taken",
];

/**
 * Le resultat de l'appel, deduit des outils que l'assistant a vraiment
 * menes a bien : un transfert refuse ou un creneau pris ne comptent pas pareil.
 */
export function outcomeFromTools(calls: { name: string; result: string }[]): CallOutcome {
  const achieved = new Set<CallOutcome>();
  for (const { name, result } of calls) {
    if (name === "book_appointment" && result.startsWith("Rendez-vous")) achieved.add("appointment_booked");
    if (name === "take_order" && result.startsWith("Commande enregistrée")) achieved.add("order_taken");
    if (name === "transfer_call" && result.startsWith("Appel transféré")) achieved.add("transferred");
    if (name === "take_message" && result.startsWith("Message enregistré")) achieved.add("message_taken");
  }
  return OUTCOME_PRIORITY.find((outcome) => achieved.has(outcome)) ?? "no_action";
}

export type CallSummaryFields = {
  reason: string | null;
  summary: string | null;
  followUp: string | null;
  callerName: string | null;
};

/** Transcription mise en forme pour le modele qui la resume. */
export function formatTranscriptForSummary(turns: TranscriptTurn[]): string {
  return turns
    .map((turn) => `${turn.speaker === "caller" ? "Appelant" : "Assistant"} : ${turn.text}`)
    .join("\n");
}

function cleanField(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /^(aucun|néant|n\/a|inconnu)\.?$/i.test(trimmed)) return null;
  return trimmed.slice(0, maxLength);
}

/** Lit la reponse JSON du modele sans lui faire confiance sur la forme. */
export function parseSummaryResponse(raw: string | null | undefined): CallSummaryFields {
  let data: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(raw ?? "{}");
    if (parsed && typeof parsed === "object") data = parsed as Record<string, unknown>;
  } catch {
    // Reponse illisible : on garde la transcription, sans resume.
  }
  return {
    reason: cleanField(data.reason, 120),
    summary: cleanField(data.summary, 600),
    followUp: cleanField(data.followUp, 240),
    callerName: cleanField(data.callerName, 80),
  };
}
