import { describe, expect, it } from "vitest";
import {
  TranscriptCollector,
  formatTranscriptForSummary,
  outcomeFromTools,
  parseSummaryResponse,
} from "./call-transcript";

describe("TranscriptCollector", () => {
  it("range la transcription de l'appelant a sa place, meme arrivee en retard", () => {
    const collector = new TranscriptCollector();
    collector.handle({ type: "conversation.item.added", item: { id: "a1", role: "assistant" } });
    collector.handle({ type: "response.output_audio_transcript.done", item_id: "a1", transcript: "Bonjour, que puis-je faire ?" });
    collector.handle({ type: "conversation.item.added", item: { id: "u1", role: "user" } });
    collector.handle({ type: "conversation.item.added", item: { id: "a2", role: "assistant" } });
    collector.handle({ type: "response.output_audio_transcript.done", item_id: "a2", transcript: "Je note votre adresse." });
    // La transcription de l'appelant aboutit apres la reponse de l'assistant.
    collector.handle({ type: "conversation.item.input_audio_transcription.completed", item_id: "u1", transcript: " J'ai une fuite. " });

    expect(collector.turns()).toEqual([
      { speaker: "assistant", text: "Bonjour, que puis-je faire ?" },
      { speaker: "caller", text: "J'ai une fuite." },
      { speaker: "assistant", text: "Je note votre adresse." },
    ]);
  });

  it("accepte l'ancien nom d'evenement et ignore les elements sans texte", () => {
    const collector = new TranscriptCollector();
    collector.handle({ type: "conversation.item.created", item: { id: "u1", role: "user" } });
    collector.handle({ type: "conversation.item.created", item: { id: "s1", role: "system" } });
    collector.handle({ type: "conversation.item.input_audio_transcription.completed", item_id: "u1", transcript: "Allô ?" });
    collector.handle({ type: "conversation.item.created", item: { id: "a1", role: "assistant" } });

    expect(collector.turns()).toEqual([{ speaker: "caller", text: "Allô ?" }]);
  });

  it("n'attend pas l'evenement de creation pour garder un texte", () => {
    const collector = new TranscriptCollector();
    expect(collector.handle({ type: "response.output_audio_transcript.done", item_id: "a1", transcript: "Au revoir." })).toBe(true);
    expect(collector.handle({ type: "response.done" })).toBe(false);
    expect(collector.turns()).toEqual([{ speaker: "assistant", text: "Au revoir." }]);
  });
});

describe("outcomeFromTools", () => {
  it("retient le resultat le plus engageant parmi ceux reussis", () => {
    expect(
      outcomeFromTools([
        { name: "take_message", result: "Message enregistré, l'entreprise rappellera." },
        { name: "book_appointment", result: "Rendez-vous confirmé et ajouté à l'agenda." },
      ])
    ).toBe("appointment_booked");
  });

  it("ne compte pas un transfert qui a echoue", () => {
    expect(
      outcomeFromTools([{ name: "transfer_call", result: "Le transfert a échoué — propose de prendre un message à la place." }])
    ).toBe("no_action");
    expect(outcomeFromTools([{ name: "transfer_call", result: "Appel transféré vers +33612345678." }])).toBe("transferred");
  });

  it("rend sans suite quand aucun outil n'a servi", () => {
    expect(outcomeFromTools([])).toBe("no_action");
    expect(outcomeFromTools([{ name: "check_availability", result: "Le créneau est libre." }])).toBe("no_action");
  });
});

describe("formatTranscriptForSummary", () => {
  it("nomme chaque interlocuteur", () => {
    expect(
      formatTranscriptForSummary([
        { speaker: "caller", text: "Bonjour" },
        { speaker: "assistant", text: "Bonjour, Plomberie Lefèvre" },
      ])
    ).toBe("Appelant : Bonjour\nAssistant : Bonjour, Plomberie Lefèvre");
  });
});

describe("parseSummaryResponse", () => {
  it("lit les champs attendus et ecarte les valeurs vides", () => {
    expect(
      parseSummaryResponse(
        JSON.stringify({ reason: "Fuite sous l'évier", summary: "Le client signale une fuite.", followUp: "Aucun", callerName: "" })
      )
    ).toEqual({ reason: "Fuite sous l'évier", summary: "Le client signale une fuite.", followUp: null, callerName: null });
  });

  it("survit a une reponse illisible ou mal typee", () => {
    expect(parseSummaryResponse("pas du json")).toEqual({ reason: null, summary: null, followUp: null, callerName: null });
    expect(parseSummaryResponse(JSON.stringify({ reason: 42 }))).toEqual({ reason: null, summary: null, followUp: null, callerName: null });
  });

  it("borne la longueur de chaque champ", () => {
    expect(parseSummaryResponse(JSON.stringify({ reason: "x".repeat(500) })).reason).toHaveLength(120);
  });
});
