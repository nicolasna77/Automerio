"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MessageCircleQuestion } from "lucide-react";
import { toast } from "@/lib/toast";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { answerCallerQuestion, dismissCallerQuestion, removeCallerAnswer } from "./caller-question-actions";

export type OpenCallerQuestion = { id: string; question: string; askedOn: string };
export type AnsweredCallerQuestion = { id: string; question: string; answer: string };

// Questions des appelants restées sans réponse : le client y répond une
// fois, l'assistant s'en sert dès l'appel suivant.
export function CallerQuestionsCard({
  open,
  answered,
  answerMax,
}: {
  open: OpenCallerQuestion[];
  answered: AnsweredCallerQuestion[];
  // Limite de la réponse, lue côté serveur (caller-questions.ts touche à la base).
  answerMax: number;
}) {
  const t = useTranslations("Dashboard.callerQuestions");
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2 text-base">
          <MessageCircleQuestion className="size-5 text-primary" aria-hidden="true" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {open.map((question) => (
              <OpenQuestionRow key={question.id} question={question} answerMax={answerMax} />
            ))}
          </ul>
        )}

        {answered.length > 0 && (
          <details className="group rounded-lg border border-border">
            <summary className="cursor-pointer list-none rounded-lg px-4 py-3 text-sm font-medium text-foreground focus-visible:focus-ring">
              {t("answeredTitle", { count: answered.length })}
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {answered.map((item) => (
                <AnsweredRow key={item.id} item={item} />
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function OpenQuestionRow({ question, answerMax }: { question: OpenCallerQuestion; answerMax: number }) {
  const t = useTranslations("Dashboard.callerQuestions");
  const tCommon = useTranslations("Common");
  const fieldId = useId();
  const errorId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [answering, setAnswering] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!answer.trim()) {
      setError(t("answerRequired"));
      fieldRef.current?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await answerCallerQuestion(question.id, answer));
        toast.success(t("saved"));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  function dismiss() {
    startTransition(async () => {
      try {
        unwrap(await dismissCallerQuestion(question.id));
        toast.success(t("dismissed"));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <p className="font-medium text-pretty text-foreground [overflow-wrap:anywhere]">{question.question}</p>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{t("askedOn", { date: question.askedOn })}</p>

      {answering ? (
        <form onSubmit={save} noValidate className="mt-3 space-y-2">
          <Label htmlFor={fieldId}>{t("answerLabel")}</Label>
          <Textarea
            ref={fieldRef}
            id={fieldId}
            rows={3}
            autoFocus
            maxLength={answerMax}
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          {error && (
            <p id={errorId} className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" size="sm" loading={pending}>
              {t("save")}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setAnswering(false)}>
              {tCommon("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setAnswering(true)}>
            {t("answer")}
          </Button>
          <Button size="sm" variant="ghost" loading={pending} onClick={dismiss}>
            {t("dismiss")}
          </Button>
        </div>
      )}
    </li>
  );
}

function AnsweredRow({ item }: { item: AnsweredCallerQuestion }) {
  const t = useTranslations("Dashboard.callerQuestions");
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      try {
        unwrap(await removeCallerAnswer(item.id));
        toast.success(t("removed"));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 text-sm">
        <p className="font-medium text-foreground [overflow-wrap:anywhere]">{item.question}</p>
        <p className="mt-0.5 text-muted-foreground [overflow-wrap:anywhere]">{item.answer}</p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="shrink-0 self-start"
        loading={pending}
        onClick={remove}
        aria-label={t("removeLabel", { question: item.question })}
      >
        {t("remove")}
      </Button>
    </li>
  );
}
