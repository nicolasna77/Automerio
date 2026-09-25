"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, ListChecks, Phone, PhoneCall, PhoneOff, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { setCallHandledAction } from "./call-actions";

const POLL_INTERVAL_MS = 5_000;

type InProgressCall = {
  id: string;
  startedAt: string;
  fromNumber: string | null;
};

type CallSummary = {
  reason: string | null;
  summary: string | null;
  followUp: string | null;
  callerName: string | null;
};

type RecentCall = {
  id: string;
  occurredAt: string;
  durationSec: number | null;
  fromNumber: string | null;
  outcome: string | null;
  endedReason: string | null;
  summary: CallSummary | null;
  handled: boolean;
};

type CallsResponse = { inProgress: InProgressCall[]; recent: RecentCall[] };

type TranscriptTurn = { speaker: "caller" | "assistant"; text: string };

const OUTCOME_LABELS: Record<string, string> = {
  appointment_booked: "Rendez-vous pris",
  order_taken: "Commande enregistrée",
  transferred: "Appel transféré",
  message_taken: "Message pris",
  no_action: "Sans suite",
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")}`;
}

function formatElapsed(startedAt: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  return formatDuration(seconds);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) return null;
  return (
    <Badge variant={outcome === "no_action" ? "outline" : "secondary"} className="shrink-0">
      {OUTCOME_LABELS[outcome] ?? outcome}
    </Badge>
  );
}

/** La transcription, chargee une seule fois, a la premiere demande. */
function Transcript({ clientServiceId, callId }: { clientServiceId: string; callId: string }) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | { status: "ready"; turns: TranscriptTurn[] }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/client-services/${clientServiceId}/calls/${callId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: { transcript: TranscriptTurn[] }) => {
        if (!cancelled) setState({ status: "ready", turns: json.transcript });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [clientServiceId, callId]);

  if (state.status === "loading") {
    return (
      <div role="status" aria-label="Chargement de la transcription…" className="space-y-2">
        <Skeleton className="h-8 w-3/4 rounded-2xl" />
        <Skeleton className="ml-auto h-8 w-2/3 rounded-2xl" />
      </div>
    );
  }
  if (state.status === "error") {
    return <p className="text-sm text-muted-foreground">La transcription n&apos;a pas pu être chargée.</p>;
  }
  if (state.turns.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune parole n&apos;a été transcrite pour cet appel.</p>;
  }

  return (
    <ol aria-label="Transcription de l'appel" className="space-y-2">
      {state.turns.map((turn, index) => (
        <li key={index} className={cn("flex", turn.speaker === "assistant" ? "justify-end" : "justify-start")}>
          <p
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug",
              turn.speaker === "assistant"
                ? "rounded-br-md bg-primary/10 text-foreground"
                : "rounded-bl-md bg-muted text-foreground"
            )}
          >
            <span className="sr-only">{turn.speaker === "assistant" ? "Assistant : " : "Appelant : "}</span>
            {turn.text}
          </p>
        </li>
      ))}
    </ol>
  );
}

function RecentCallItem({
  call,
  clientServiceId,
  expanded,
  onToggle,
}: {
  call: RecentCall;
  clientServiceId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const [showTranscript, setShowTranscript] = useState(false);
  // L'etat affiche suit le clic tout de suite ; la prochaine interrogation de
  // la liste le confirme.
  const [handledOverride, setHandledOverride] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  // Une fois la liste d'accord avec le clic, on la suit de nouveau : sinon un
  // collegue qui rouvre l'appel ne se verrait jamais ici.
  if (handledOverride !== null && !isPending && call.handled === handledOverride) {
    setHandledOverride(null);
  }
  const handled = handledOverride ?? call.handled;
  const caller = call.summary?.callerName ?? call.fromNumber ?? "Numéro masqué";
  const hasDetail = call.summary !== null;
  const needsCallback = Boolean(call.summary?.followUp) && !handled;

  function toggleHandled() {
    const next = !handled;
    setHandledOverride(next);
    startTransition(async () => {
      try {
        unwrap(await setCallHandledAction(clientServiceId, call.id, next));
      } catch (err) {
        setHandledOverride(null);
        toast.error(getErrorMessage(err, "L'appel n'a pas pu être mis à jour."));
      }
    });
  }

  const header = (
    <>
      <PhoneOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="font-medium text-foreground">{call.summary?.reason ?? caller}</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatDateTime(call.occurredAt)} · {formatDuration(call.durationSec)}
          </span>
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {call.summary?.reason && <span>{caller}</span>}
          <OutcomeBadge outcome={call.outcome} />
          {needsCallback && <Badge className="shrink-0">À rappeler</Badge>}
          {handled && call.summary?.followUp && (
            <Badge variant="outline" className="shrink-0">
              Traité
            </Badge>
          )}
        </span>
      </span>
    </>
  );

  if (!hasDetail) {
    return <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-card p-3 text-sm">{header}</li>;
  }

  return (
    <li className="rounded-2xl border border-border bg-card text-sm transition-colors has-[button[aria-expanded=true]]:border-primary/30">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-start gap-2.5 rounded-2xl p-3 text-left transition-colors hover:bg-muted/50 focus-visible:focus-ring"
      >
        {header}
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
            expanded && "rotate-180"
          )}
          aria-hidden="true"
        />
        <span className="sr-only">{expanded ? "Masquer le détail" : "Afficher le détail"}</span>
      </button>

      {expanded && (
        <div id={panelId} className="space-y-3 border-t border-border px-3 pt-3 pb-4 sm:pl-9">
          {call.summary?.summary && <p className="leading-relaxed text-foreground">{call.summary.summary}</p>}
          {call.summary?.followUp && (
            <p className="flex items-start gap-2 rounded-xl bg-primary/10 px-3 py-2 text-foreground">
              <ListChecks className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="font-medium">À faire : </span>
                {call.summary.followUp}
              </span>
            </p>
          )}
          {call.summary?.callerName && call.fromNumber && (
            <p className="text-xs text-muted-foreground">
              Numéro : <span className="tabular-nums">{call.fromNumber}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {call.fromNumber && (
              <a href={`tel:${call.fromNumber}`} className={buttonVariants({ size: "sm" })}>
                <Phone aria-hidden="true" data-icon="inline-start" />
                Rappeler
              </a>
            )}
            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={toggleHandled}>
              {handled ? (
                <>
                  <RotateCcw aria-hidden="true" data-icon="inline-start" />
                  Rouvrir
                </>
              ) : (
                <>
                  <Check aria-hidden="true" data-icon="inline-start" />
                  Marquer comme traité
                </>
              )}
            </Button>
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={showTranscript}
              onClick={() => setShowTranscript((value) => !value)}
            >
              {showTranscript ? "Masquer la transcription" : "Voir la transcription"}
            </Button>
            {showTranscript && (
              <div className="mt-3">
                <Transcript clientServiceId={clientServiceId} callId={call.id} />
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function CallActivity({ clientServiceId }: { clientServiceId: string }) {
  const [data, setData] = useState<CallsResponse | null>(null);
  // Hors des lignes : la liste est remplacee a chaque interrogation, un appel
  // ouvert doit le rester.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/client-services/${clientServiceId}/calls`);
        if (!res.ok) return;
        const json: CallsResponse = await res.json();
        if (!cancelled) setData(json);
      } catch {
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [clientServiceId]);

  function toggle(callId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(callId)) next.delete(callId);
      else next.add(callId);
      return next;
    });
  }

  if (!data) {
    return (
      <div
        role="status"
        aria-label="Chargement de l'activité des appels…"
        className="space-y-2"
      >
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.inProgress.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-primary motion-safe:animate-pulse"
            />
            Appel{data.inProgress.length > 1 ? "s" : ""} en cours
          </h3>
          <ul className="space-y-1.5">
            {data.inProgress.map((call) => (
              <li
                key={call.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <PhoneCall
                    className="size-3.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {call.fromNumber ?? "Numéro masqué"}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatElapsed(call.startedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">
          Récapitulatif des appels
        </h3>
        {data.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun appel terminé pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {data.recent.map((call) => (
              <RecentCallItem
                key={call.id}
                call={call}
                clientServiceId={clientServiceId}
                expanded={expandedIds.has(call.id)}
                onToggle={() => toggle(call.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
