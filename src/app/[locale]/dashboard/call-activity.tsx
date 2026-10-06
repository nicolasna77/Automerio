"use client";

import { useLabels } from "@/hooks/use-labels";
import { useEffect, useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Check, ChevronDown, ListChecks, Phone, PhoneCall, PhoneIncoming, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { setCallHandledAction } from "./call-actions";
import { pollWhileVisible } from "@/lib/poll-while-visible";
import { formatFrenchPhone } from "@/lib/phone-format";

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

type CallsResponse = {
  inProgress: InProgressCall[];
  recent: RecentCall[];
  pendingCount: number;
  days: { day: string; count: number }[];
  // Vrai quand la liste filtrée a été coupée à sa limite.
  truncated?: boolean;
};

type StatusFilter = "all" | "todo" | "done";

const STATUS_FILTERS: StatusFilter[] = ["all", "todo", "done"];

const ALL_DAYS = "all";

type CallsT = ReturnType<typeof useTranslations<"Dashboard.calls">>;

type TranscriptTurn = { speaker: "caller" | "assistant"; text: string };

const OUTCOMES = ["appointment_booked", "order_taken", "transferred", "message_taken", "no_action"] as const;
type Outcome = (typeof OUTCOMES)[number];
const isOutcome = (value: string): value is Outcome => (OUTCOMES as readonly string[]).includes(value);

function formatDuration(seconds: number | null, t: CallsT): string {
  if (seconds === null) return t("duration.unknown");
  if (seconds < 60) return t("duration.seconds", { seconds });
  return t("duration.minutes", { minutes: Math.floor(seconds / 60), seconds: String(seconds % 60).padStart(2, "0") });
}

function formatElapsed(startedAt: string, t: CallsT): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  return formatDuration(seconds, t);
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
  const t = useTranslations("Dashboard.calls.outcomes");
  if (!outcome) return null;
  return (
    <Badge variant={outcome === "no_action" ? "outline" : "secondary"} className="shrink-0">
      {isOutcome(outcome) ? t(outcome) : outcome}
    </Badge>
  );
}

function Transcript({ clientServiceId, callId }: { clientServiceId: string; callId: string }) {
  const t = useTranslations("Dashboard.calls.transcript");
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
      <div role="status" aria-label={t("loading")} className="space-y-2">
        <Skeleton className="h-8 w-3/4 rounded-2xl" />
        <Skeleton className="ml-auto h-8 w-2/3 rounded-2xl" />
      </div>
    );
  }
  if (state.status === "error") {
    return <p className="text-sm text-muted-foreground">{t("error")}</p>;
  }
  if (state.turns.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <ol aria-label={t("label")} className="space-y-2">
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
            <span className="sr-only">{turn.speaker === "assistant" ? t("assistant") : t("caller")}</span>
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
  const t = useTranslations("Dashboard.calls");
  const panelId = useId();
  const [showTranscript, setShowTranscript] = useState(false);
  const [handledOverride, setHandledOverride] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  if (handledOverride !== null && !isPending && call.handled === handledOverride) {
    setHandledOverride(null);
  }
  const handled = handledOverride ?? call.handled;
  const caller = call.summary?.callerName ?? (call.fromNumber ? formatFrenchPhone(call.fromNumber) : t("hiddenNumber"));
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
        toast.error(getErrorMessage(err, t("updateError")));
      }
    });
  }

  const header = (
    <>
      <PhoneIncoming className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="font-medium text-foreground">{call.summary?.reason ?? caller}</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatDateTime(call.occurredAt)} · {formatDuration(call.durationSec, t)}
          </span>
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {call.summary?.reason && <span>{caller}</span>}
          <OutcomeBadge outcome={call.outcome} />
          {needsCallback && <Badge className="shrink-0">{t("toCallBack")}</Badge>}
          {handled && call.summary?.followUp && (
            <Badge variant="outline" className="shrink-0">
              {t("handled")}
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
        <span className="sr-only">{expanded ? t("hideDetail") : t("showDetail")}</span>
      </button>

      {expanded && (
        <div id={panelId} className="space-y-3 border-t border-border px-3 pt-3 pb-4 sm:pl-9">
          {call.summary?.summary && <p className="leading-relaxed text-foreground">{call.summary.summary}</p>}
          {call.summary?.followUp && (
            <p className="flex items-start gap-2 rounded-xl bg-primary/10 px-3 py-2 text-foreground">
              <ListChecks className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="font-medium">{t("todo")}</span>
                {call.summary.followUp}
              </span>
            </p>
          )}
          {call.summary?.callerName && call.fromNumber && (
            <p className="text-xs text-muted-foreground">
              {t("number")}
              <span className="tabular-nums">{formatFrenchPhone(call.fromNumber)}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {call.fromNumber && (
              <a href={`tel:${call.fromNumber}`} className={buttonVariants({ size: "sm" })}>
                <Phone aria-hidden="true" data-icon="inline-start" />
                {t("callBack")}
              </a>
            )}
            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={toggleHandled}>
              {handled ? (
                <>
                  <RotateCcw aria-hidden="true" data-icon="inline-start" />
                  {t("reopen")}
                </>
              ) : (
                <>
                  <Check aria-hidden="true" data-icon="inline-start" />
                  {t("markHandled")}
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
              {showTranscript ? t("transcript.hide") : t("transcript.show")}
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
  const t = useTranslations("Dashboard.calls");
  const labels = useLabels();
  const [data, setData] = useState<CallsResponse | null>(null);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [day, setDay] = useState<string>(ALL_DAYS);
  // Vrai entre un changement de filtre et l'arrivée de la liste filtrée.
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams();
    if (status !== "all") query.set("status", status);
    if (day !== ALL_DAYS) query.set("day", day);
    const search = query.toString();
    const url = `/api/client-services/${clientServiceId}/calls${search ? `?${search}` : ""}`;

    async function poll() {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          if (!cancelled) setFiltering(false);
          return;
        }
        const json: CallsResponse = await res.json();
        if (!cancelled) {
          setData(json);
          setFiltering(false);
        }
      } catch {
        if (!cancelled) setFiltering(false);
      }
    }

    poll();
    const stopPolling = pollWhileVisible(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [clientServiceId, status, day]);

  function changeStatus(next: StatusFilter) {
    if (next === status) return;
    setFiltering(true);
    setStatus(next);
  }

  function changeDay(next: string) {
    if (next === day) return;
    setFiltering(true);
    setDay(next);
  }

  function resetFilters() {
    setFiltering(true);
    setStatus("all");
    setDay(ALL_DAYS);
  }

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
        aria-label={t("loading")}
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
              className="size-2 rounded-full bg-primary"
            />
            {t("inProgress", { count: data.inProgress.length })}
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
                  {call.fromNumber ? formatFrenchPhone(call.fromNumber) : t("hiddenNumber")}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatElapsed(call.startedAt, t)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label={t("filters.label")} className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={status === filter ? "secondary" : "ghost"}
                aria-pressed={status === filter}
                onClick={() => changeStatus(filter)}
              >
                {t(`filters.${filter}`)}
                {filter === "todo" && data.pendingCount > 0 && (
                  <Badge className="ml-0.5 tabular-nums">{data.pendingCount}</Badge>
                )}
              </Button>
            ))}
          </div>
          <Select
            value={day}
            items={[
              { value: ALL_DAYS, label: t("allDays") },
              ...data.days.map((entry) => ({ value: entry.day, label: labels.dayLabel(entry.day) })),
            ]}
            onValueChange={(next) => changeDay(next ?? ALL_DAYS)}
          >
            <SelectTrigger aria-label={t("dayFilterLabel")} size="sm" className="min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DAYS}>{t("allDays")}</SelectItem>
              {data.days.map((entry) => (
                <SelectItem key={entry.day} value={entry.day}>
                  {labels.dayLabel(entry.day)}
                  <span className="sr-only">, </span>
                  <span className="ml-auto pl-3 text-xs tabular-nums text-muted-foreground">
                    {t("callCount", { count: entry.count })}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p role="status" className="sr-only">
          {filtering
            ? t("updating")
            : data.truncated
              ? t("mostRecent", { count: data.recent.length })
              : t("inList", { count: data.recent.length })}
        </p>
        {data.truncated && !filtering && (
          <p className="mb-2 text-xs text-muted-foreground">
            {t("truncatedHint", { count: data.recent.length })}
          </p>
        )}

        {data.recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm">
            <p className="text-muted-foreground">
              {(() => {
                const empty = status === "todo" ? t("emptyTodo") : status === "done" ? t("emptyDone") : t("emptyAll");
                return day !== ALL_DAYS ? t("emptyForDay", { empty, day: labels.dayPhrase(day) }) : t("emptyNow", { empty });
              })()}
            </p>
            {(status !== "all" || day !== ALL_DAYS) && (
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={resetFilters}>
                {t("seeAll")}
              </Button>
            )}
          </div>
        ) : (
          <ul className={cn("space-y-1.5 transition-opacity", filtering && "opacity-60")} aria-busy={filtering}>
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
