"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, Bot, Hand, Loader2, MessageSquare, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pollWhileVisible } from "@/lib/poll-while-visible";
import { parisDayKey } from "@/lib/paris-day";
import { dayLabel, dayPhrase } from "@/lib/day-label";
import { unwrap } from "@/lib/action-result";
import { cn, getErrorMessage } from "@/lib/utils";
import { MAX_REPLY_LENGTH } from "@/lib/conversation-limits";
import type { ConversationDay, ConversationView, MessageAuthor } from "@/lib/conversations";
import {
  handBackConversation,
  sendConversationReply,
  takeOverConversation,
} from "@/app/[locale]/dashboard/conversation-actions";

const POLL_INTERVAL_MS = 5000;
const ALL_DAYS = "all";
const TIME_ZONE = "Europe/Paris";
// Le compteur n'apparaît qu'à l'approche de la limite.
const COUNTER_THRESHOLD = MAX_REPLY_LENGTH - 200;

const CHANNEL_LABELS: Record<ConversationView["channel"], string> = {
  WHATSAPP: "WhatsApp",
  MESSENGER: "Messenger",
  INSTAGRAM: "Instagram",
};

const timeFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const shortDayFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, day: "numeric", month: "short" });
const longDayFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const deadlineFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function relativeDayKey(offsetDays: number): string {
  return parisDayKey(new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000));
}

// Heure seule pour aujourd'hui, date courte au-delà : comme une messagerie.
function formatListTime(iso: string): string {
  const date = new Date(iso);
  return parisDayKey(date) === relativeDayKey(0) ? timeFormat.format(date) : shortDayFormat.format(date);
}

function formatDaySeparator(dayKey: string, sample: Date): string {
  if (dayKey === relativeDayKey(0)) return "Aujourd'hui";
  if (dayKey === relativeDayKey(1)) return "Hier";
  return longDayFormat.format(sample);
}

function authorPrefix(author: MessageAuthor): string {
  if (author === "ASSISTANT") return "Assistant : ";
  if (author === "HUMAN") return "Vous : ";
  return "";
}

function needsReply(conversation: ConversationView): boolean {
  return conversation.humanTakeover && conversation.messages.at(-1)?.author === "CONTACT";
}

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

function isWindowOpen(conversation: ConversationView): boolean {
  return (
    conversation.replyWindowClosesAt !== null && new Date(conversation.replyWindowClosesAt).getTime() > Date.now()
  );
}

export function ConversationInbox({
  clientServiceId,
  initialConversations,
  initialDays,
}: {
  clientServiceId: string;
  initialConversations: ConversationView[];
  initialDays: ConversationDay[];
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [days, setDays] = useState(initialDays);
  const [day, setDay] = useState<string>(ALL_DAYS);
  const [filtering, setFiltering] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id ?? null);
  // Sur mobile, la liste et la conversation s'affichent l'une après l'autre.
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const dayParam = day === ALL_DAYS ? null : day;
  // Le premier rendu vient du serveur : pas de rechargement immédiat au montage.
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    const url = `/api/client-services/${clientServiceId}/conversations${dayParam ? `?day=${dayParam}` : ""}`;
    async function poll() {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const json: { conversations: ConversationView[]; days: ConversationDay[] } = await res.json();
        if (!cancelled) {
          setConversations(json.conversations);
          setDays(json.days);
        }
      } catch {
        // Réseau momentanément indisponible : le prochain passage réessaie.
      } finally {
        if (!cancelled) setFiltering(false);
      }
    }
    // Au changement de jour, la liste se recharge tout de suite.
    if (isFirstLoad.current) isFirstLoad.current = false;
    else poll();
    const stopPolling = pollWhileVisible(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [clientServiceId, dayParam]);

  function changeDay(next: string) {
    if (next === day) return;
    setFiltering(true);
    setDay(next);
    setMobileView("list");
  }

  // Si la conversation ouverte sort du filtre, la première de la liste prend sa place.
  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0] ?? null;

  if (conversations.length === 0 && day === ALL_DAYS && !filtering) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <MessageSquare className="size-5 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium text-foreground">Aucune conversation pour l&apos;instant</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Les échanges de l&apos;assistant avec vos clients apparaîtront ici. Vous pourrez reprendre la main sur
          chacun et répondre vous-même.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-sm text-muted-foreground">
          {filtering
            ? "Mise à jour de la liste…"
            : `${plural(conversations.length, "conversation")}${day === ALL_DAYS ? "" : ` ${dayPhrase(day)}`}`}
        </p>
        <Select
          value={day}
          items={[
            { value: ALL_DAYS, label: "Tous les jours" },
            ...days.map((entry) => ({ value: entry.day, label: dayLabel(entry.day) })),
          ]}
          onValueChange={(next) => changeDay(next ?? ALL_DAYS)}
        >
          <SelectTrigger aria-label="Filtrer par jour" size="sm" className="min-w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DAYS}>Tous les jours</SelectItem>
            {days.map((entry) => (
              <SelectItem key={entry.day} value={entry.day}>
                {dayLabel(entry.day)}
                <span className="sr-only">, </span>
                <span className="ml-auto pl-3 text-xs tabular-nums text-muted-foreground">
                  {plural(entry.count, "conversation")}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm">
          <p className="text-muted-foreground">
            {filtering ? "Mise à jour de la liste…" : `Aucune conversation ${dayPhrase(day)}.`}
          </p>
          {!filtering && (
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => changeDay(ALL_DAYS)}>
              Voir toutes les conversations
            </Button>
          )}
        </div>
      ) : (
        <div
          aria-busy={filtering}
          className={cn(
            "grid h-[36rem] overflow-hidden rounded-lg border border-border transition-opacity duration-150 motion-reduce:transition-none md:grid-cols-[17rem_minmax(0,1fr)]",
            filtering && "opacity-60"
          )}
        >
          <nav
            aria-label="Liste des conversations"
            className={cn(
              "min-h-0 overflow-y-auto border-border md:block md:border-r",
              mobileView === "thread" && "hidden"
            )}
          >
            <ul className="divide-y divide-border">
              {conversations.map((conversation) => {
                const last = conversation.messages.at(-1);
                const isSelected = conversation.id === selected?.id;
                const unanswered = needsReply(conversation);
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      aria-current={isSelected ? "true" : undefined}
                      onClick={() => {
                        setSelectedId(conversation.id);
                        setMobileView("thread");
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors duration-150 hover:bg-muted/60 focus-visible:focus-ring focus-visible:-outline-offset-2 motion-reduce:transition-none",
                        isSelected && "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                          conversation.humanTakeover ? "bg-attention/15 text-attention" : "bg-primary/10 text-primary"
                        )}
                        aria-hidden="true"
                      >
                        {conversation.humanTakeover ? <Hand className="size-4" /> : <Bot className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-mono text-sm font-medium tabular-nums text-foreground">
                            {conversation.contact}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {formatListTime(conversation.lastMessageAt)}
                          </span>
                        </span>
                        {last && (
                          <span
                            className={cn(
                              "mt-0.5 block truncate text-sm",
                              unanswered ? "font-medium text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {authorPrefix(last.author)}
                            {last.text}
                          </span>
                        )}
                        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          {conversation.humanTakeover ? "Vous avez la main" : "Assistant actif"}
                          {unanswered && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-attention">À répondre</span>
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section
            aria-label={selected ? `Conversation avec ${selected.contact}` : "Conversation"}
            className={cn("min-h-0 min-w-0 flex-col md:flex", mobileView === "list" ? "hidden" : "flex")}
          >
            {selected ? (
              <ConversationThread
                key={selected.id}
                conversation={selected}
                visible={mobileView === "thread"}
                onBack={() => setMobileView("list")}
                day={dayParam}
                onUpdate={setConversations}
              />
            ) : (
              <p className="m-auto p-6 text-sm text-muted-foreground">Choisissez une conversation.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ConversationThread({
  conversation,
  visible,
  day,
  onBack,
  onUpdate,
}: {
  conversation: ConversationView;
  visible: boolean;
  day: string | null;
  onBack: () => void;
  onUpdate: (conversations: ConversationView[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();
  const [isToggling, startToggling] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const windowOpen = isWindowOpen(conversation);
  const lastMessageId = conversation.messages.at(-1)?.id;

  // Le dernier message reste visible à l'ouverture, à chaque nouveau message,
  // et quand le fil apparaît sur mobile (masqué, il n'a pas de hauteur).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastMessageId, pendingText, visible]);

  function toggleTakeover() {
    startToggling(async () => {
      try {
        const action = conversation.humanTakeover ? handBackConversation : takeOverConversation;
        onUpdate(unwrap(await action(conversation.id, day)));
        if (!conversation.humanTakeover) textareaRef.current?.focus();
      } catch (err) {
        toast.error(getErrorMessage(err, "La conversation n'a pas pu être mise à jour."));
      }
    });
  }

  function send() {
    const text = draft.trim();
    if (!text || isSending) return;
    setPendingText(text);
    setDraft("");
    startSending(async () => {
      try {
        onUpdate(unwrap(await sendConversationReply(conversation.id, text, day)));
      } catch (err) {
        setDraft(text);
        toast.error(getErrorMessage(err, "Le message n'a pas pu être envoyé."));
      } finally {
        setPendingText(null);
      }
    });
  }

  // Messages regroupés par jour (heure de Paris).
  const days: { key: string; messages: ConversationView["messages"] }[] = [];
  for (const message of conversation.messages) {
    const key = parisDayKey(new Date(message.createdAt));
    const current = days.at(-1);
    if (current?.key === key) current.messages.push(message);
    else days.push({ key, messages: [message] });
  }

  return (
    <>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2.5 sm:px-4">
        <Button variant="ghost" size="icon-sm" className="-ml-1 md:hidden" onClick={onBack} aria-label="Retour aux conversations">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-medium tabular-nums text-foreground">{conversation.contact}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
            {conversation.humanTakeover ? (
              <>
                <Hand className="size-3.5 shrink-0 text-attention" aria-hidden="true" />
                Assistant en pause
              </>
            ) : (
              <>
                <Bot className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                Assistant actif
              </>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTakeover}
          disabled={isToggling}
          className="w-full sm:w-auto"
        >
          {isToggling ? (
            <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : conversation.humanTakeover ? (
            <Bot aria-hidden="true" />
          ) : (
            <Hand aria-hidden="true" />
          )}
          {conversation.humanTakeover ? "Rendre la main à l'assistant" : "Reprendre la main"}
        </Button>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-background/60 px-3 py-4 sm:px-4">
        <ol aria-label={`Échanges avec ${conversation.contact}`} className="space-y-1">
          {days.map((day) => (
            <Fragment key={day.key}>
              <li aria-hidden="true" className="flex justify-center py-2">
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground first-letter:uppercase">
                  {formatDaySeparator(day.key, new Date(day.messages[0].createdAt))}
                </span>
              </li>
              {day.messages.map((message, index) => {
                const previous = day.messages[index - 1];
                // Le nom de l'auteur ne s'affiche qu'au début d'une suite de messages.
                const showAuthor = message.author !== "CONTACT" && previous?.author !== message.author;
                return (
                  <MessageBubble
                    key={message.id}
                    author={message.author}
                    authorName={message.authorName}
                    text={message.text}
                    time={timeFormat.format(new Date(message.createdAt))}
                    showAuthor={showAuthor}
                    spaced={previous !== undefined && previous.author !== message.author}
                  />
                );
              })}
            </Fragment>
          ))}
          {pendingText && (
            <MessageBubble author="HUMAN" authorName={null} text={pendingText} time="Envoi…" showAuthor={false} spaced pending />
          )}
        </ol>
      </div>

      <footer className="border-t border-border p-3 sm:px-4">
        {windowOpen ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <label htmlFor={`reply-${conversation.id}`} className="sr-only">
              Votre réponse à {conversation.contact}
            </label>
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                id={`reply-${conversation.id}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  // Entrée envoie, Maj+Entrée passe à la ligne.
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    send();
                  }
                }}
                maxLength={MAX_REPLY_LENGTH}
                rows={1}
                placeholder="Écrire une réponse…"
                className="max-h-36 min-h-10 rounded-lg py-2.5"
              />
              <Button
                type="submit"
                size="icon-lg"
                disabled={!draft.trim() || isSending}
                aria-label="Envoyer la réponse"
                className="rounded-lg"
              >
                {isSending ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <SendHorizontal />}
              </Button>
            </div>
            <p className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                {conversation.humanTakeover
                  ? `Réponse possible jusqu'à ${deadlineFormat.format(new Date(conversation.replyWindowClosesAt!))}.`
                  : "En répondant, vous mettez l'assistant en pause pour ce contact."}
              </span>
              {draft.length > COUNTER_THRESHOLD && (
                <span className="tabular-nums" aria-live="polite">
                  {draft.length} / {MAX_REPLY_LENGTH}
                </span>
              )}
            </p>
          </form>
        ) : (
          <p className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
            Ce contact ne vous a pas écrit depuis plus de 24 heures. {CHANNEL_LABELS[conversation.channel]} vous
            permettra de répondre dès son prochain message.
          </p>
        )}
      </footer>
    </>
  );
}

function MessageBubble({
  author,
  authorName,
  text,
  time,
  showAuthor,
  spaced,
  pending = false,
}: {
  author: MessageAuthor;
  authorName: string | null;
  text: string;
  time: string;
  showAuthor: boolean;
  spaced: boolean;
  pending?: boolean;
}) {
  const fromContact = author === "CONTACT";
  const label = author === "ASSISTANT" ? "Assistant" : author === "HUMAN" ? (authorName ?? "Vous") : "Client";
  return (
    <li className={cn("flex flex-col", fromContact ? "items-start" : "items-end", spaced && "pt-2")}>
      {showAuthor && (
        <span className="mb-1 flex items-center gap-1 px-1 text-xs text-muted-foreground" aria-hidden="true">
          {author === "ASSISTANT" ? <Bot className="size-3.5" /> : <Hand className="size-3.5" />}
          {label}
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-snug whitespace-pre-wrap break-words sm:max-w-[75%]",
          fromContact && "bg-muted text-foreground",
          author === "ASSISTANT" && "bg-primary/10 text-foreground",
          author === "HUMAN" && "bg-primary text-primary-foreground",
          pending && "opacity-70"
        )}
      >
        <span className="sr-only">{label} : </span>
        {text}
        <span
          className={cn(
            "mt-1 block text-right text-[0.6875rem] tabular-nums",
            author === "HUMAN" ? "text-primary-foreground/80" : "text-muted-foreground"
          )}
        >
          {time}
        </span>
      </div>
    </li>
  );
}
