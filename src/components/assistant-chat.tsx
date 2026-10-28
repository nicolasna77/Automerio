"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Loader2, MessageCircleQuestion, RotateCcw, SendHorizontal, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant } from "@/app/[locale]/assistant-chat-actions";
import { MAX_QUESTION_LENGTH, readStoredTurn, type AssistantAnswer, type ChatArea, type ChatTurn } from "@/lib/assistant-chat";
import { cn } from "@/lib/utils";

type Turn = ChatTurn & { links?: AssistantAnswer["links"] };

const STORAGE_KEY = "automerio:assistant-chat";
// Le compteur n'apparaît qu'à l'approche de la limite.
const COUNTER_FROM = MAX_QUESTION_LENGTH - 100;

// Pages où l'assistant gênerait : connexion, invitation et espace équipe.
const HIDDEN_PREFIXES = ["/admin", "/login", "/signup", "/forgot-password", "/reset-password", "/invitation"];

function isHiddenOn(pathname: string): boolean {
  return HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// La conversation vit dans l'onglet : elle survit à un changement de page,
// pas à la fermeture. Stockage indisponible (navigation privée) : on s'en passe.
function readStoredTurns(): Turn[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.map(readStoredTurn).filter((turn) => turn !== null) : [];
  } catch {
    return [];
  }
}

export function AssistantChat() {
  const pathname = usePathname();
  if (isHiddenOn(pathname)) return null;
  return <AssistantChatPanel area={pathname.startsWith("/dashboard") ? "dashboard" : "public"} />;
}

function AssistantChatPanel({ area }: { area: ChatArea }) {
  const t = useTranslations("AssistantChat");
  const panelId = useId();
  const titleId = useId();
  const inputId = useId();
  const counterId = useId();
  const [open, setOpen] = useState(false);
  // Le panneau est fermé au premier rendu : lire le stockage ici ne crée
  // aucun écart d'hydratation.
  const [turns, setTurns] = useState<Turn[]>(readStoredTurns);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns));
    } catch {
      // Stockage plein ou bloqué : la conversation reste en mémoire.
    }
  }, [turns]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [open, turns, pending, error]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  async function ask(history: Turn[]) {
    setPending(true);
    setError(null);
    const result = await askAssistant(
      history.map(({ role, text }) => ({ role, text })),
      area
    ).catch(() => ({ ok: false as const, error: t("unavailable") }));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTurns([...history, { role: "assistant", text: result.data.reply, links: result.data.links }]);
  }

  function send(question: string) {
    const text = question.trim();
    if (!text || text.length > MAX_QUESTION_LENGTH || pending) return;
    const history: Turn[] = [...turns, { role: "user", text }];
    setTurns(history);
    setDraft("");
    void ask(history);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    send(draft);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(draft);
    }
  }

  function reset() {
    setTurns([]);
    setError(null);
    inputRef.current?.focus();
  }

  const tooLong = draft.length > MAX_QUESTION_LENGTH;
  const lastTurn = turns[turns.length - 1];
  // Question restée sans réponse : échec, ou page rechargée pendant l'attente.
  const canRetry = !pending && lastTurn?.role === "user";

  return (
    <>
      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
          className="fixed right-4 bottom-20 z-50 flex max-h-[min(36rem,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-lg sm:right-6 sm:bottom-24"
        >
          <header className="flex items-start gap-3 border-b px-4 py-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageCircleQuestion className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-sm font-semibold">
                {t("title")}
              </h2>
              <p className="text-[13px] text-muted-foreground">{t("subtitle")}</p>
            </div>
            {turns.length > 0 && (
              <Button variant="ghost" size="icon-sm" onClick={reset} disabled={pending} aria-label={t("reset")}>
                <RotateCcw aria-hidden="true" />
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" onClick={close} aria-label={t("close")}>
              <X aria-hidden="true" />
            </Button>
          </header>

          <div role="log" aria-live="polite" className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <AssistantText text={t("welcome")} label={t("assistant")} />

            {turns.length === 0 && (
              <ul aria-label={t("suggestionsLabel")} className="flex flex-col items-start gap-2">
                  {(["first", "second", "third"] as const).map((key) => {
                    const question = t(`suggestions.${area}.${key}`);
                    return (
                      <li key={key}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto min-h-8 rounded-lg py-1.5 text-left whitespace-normal"
                          onClick={() => send(question)}
                          disabled={pending}
                        >
                          {question}
                        </Button>
                      </li>
                    );
                  })}
              </ul>
            )}

            {turns.map((turn, index) =>
              turn.role === "user" ? (
                <p key={index} className="ml-auto w-fit max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line">
                  <span className="sr-only">{t("you")} : </span>
                  {turn.text}
                </p>
              ) : (
                <div key={index}>
                  <AssistantText text={turn.text} label={t("assistant")} />
                  {turn.links && turn.links.length > 0 && (
                    <nav aria-label={t("linksLabel")} className="mt-2">
                      <ul className="divide-y overflow-hidden rounded-lg border">
                        {turn.links.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 transition-colors duration-150 hover:bg-muted focus-visible:focus-ring motion-reduce:transition-none"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium">{link.label}</span>
                                <span className="block font-mono text-xs break-all text-muted-foreground">{link.href}</span>
                              </span>
                              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  )}
                </div>
              )
            )}

            {pending && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                {t("thinking")}
              </p>
            )}

            {(error || canRetry) && (
              <div className="space-y-2">
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                {canRetry && (
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => void ask(turns)}>
                    {t("retry")}
                  </Button>
                )}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={onSubmit} className="border-t p-3">
            <Label htmlFor={inputId} className="sr-only">
              {t("inputLabel")}
            </Label>
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                id={inputId}
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={t("placeholder")}
                aria-invalid={tooLong || undefined}
                aria-describedby={draft.length > COUNTER_FROM ? counterId : undefined}
                className="max-h-32 min-h-10 rounded-lg py-2"
              />
              <Button
                type="submit"
                size="icon"
                className="rounded-lg"
                loading={pending}
                disabled={!draft.trim() || tooLong}
                aria-label={t("send")}
              >
                {!pending && <SendHorizontal aria-hidden="true" />}
              </Button>
            </div>
            {draft.length > COUNTER_FROM && (
              <p
                id={counterId}
                className={cn("mt-1 font-mono text-xs tabular-nums", tooLong ? "text-destructive" : "text-muted-foreground")}
              >
                {tooLong ? t("tooLong", { max: MAX_QUESTION_LENGTH }) : t("counter", { count: draft.length, max: MAX_QUESTION_LENGTH })}
              </p>
            )}
            <p className="mt-2 text-[13px] text-muted-foreground">{t("disclaimer")}</p>
          </form>
        </section>
      )}

      <Button
        ref={launcherRef}
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="fixed right-4 bottom-4 z-50 h-11 rounded-lg px-3 shadow-lg sm:right-6 sm:bottom-6"
      >
        {open ? <ChevronDown className="size-5" aria-hidden="true" /> : <MessageCircleQuestion className="size-5" aria-hidden="true" />}
        <span className="sr-only sm:not-sr-only">{t("open")}</span>
      </Button>
    </>
  );
}

function AssistantText({ text, label }: { text: string; label: string }) {
  return (
    <p className="max-w-[95%] text-sm leading-relaxed whitespace-pre-line">
      <span className="sr-only">{label} : </span>
      {text}
    </p>
  );
}
