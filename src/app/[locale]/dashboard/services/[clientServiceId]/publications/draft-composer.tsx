"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import type { InstagramDraftKind } from "@prisma/client";
import { Sparkles } from "lucide-react";
import { toast } from "@/lib/toast";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import {
  DETAILS_MAX,
  DRAFT_GOALS,
  DRAFT_KINDS,
  needsGoal,
  SUBJECT_MAX,
  type DraftGoal,
} from "@/lib/instagram-drafts/content";
import { createInstagramDraft } from "./actions";

// Un onglet par type de brouillon ; chaque formulaire garde sa saisie quand on
// passe d'un onglet à l'autre (panneaux montés).
export function DraftComposer({ clientServiceId, dailyLimit }: { clientServiceId: string; dailyLimit: number }) {
  const t = useTranslations("Dashboard.instagramDrafts");
  return (
    <Card>
      <CardContent>
        <Tabs defaultValue="CAPTION">
          <TabsList aria-label={t("kindsLabel")}>
            {DRAFT_KINDS.map((kind) => (
              <TabsTab key={kind} value={kind}>
                {t(`kinds.${kind}`)}
              </TabsTab>
            ))}
          </TabsList>
          {DRAFT_KINDS.map((kind) => (
            <TabsPanel key={kind} value={kind} keepMounted className="pt-5 data-[hidden]:hidden">
              <ComposerForm clientServiceId={clientServiceId} kind={kind} />
            </TabsPanel>
          ))}
        </Tabs>
        <p className="mt-4 text-[13px] text-muted-foreground">{t("composer.limit", { count: dailyLimit })}</p>
      </CardContent>
    </Card>
  );
}

function ComposerForm({ clientServiceId, kind }: { clientServiceId: string; kind: InstagramDraftKind }) {
  const t = useTranslations("Dashboard.instagramDrafts.composer");
  const ids = { subject: useId(), goal: useId(), details: useId(), hint: useId() };
  const subjectRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [goal, setGoal] = useState<DraftGoal>("saves");
  const [details, setDetails] = useState("");
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const withGoal = needsGoal(kind);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!subject.trim()) {
      setSubjectError(t("subjectRequired"));
      subjectRef.current?.focus();
      return;
    }
    setSubjectError(null);
    startTransition(async () => {
      try {
        unwrap(
          await createInstagramDraft(clientServiceId, {
            kind,
            subject,
            goal: withGoal ? goal : null,
            details,
          })
        );
        toast.success(t("created"));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  const subjectErrorId = `${ids.subject}-error`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <p className="text-sm text-muted-foreground">{t(`intro.${kind}`)}</p>

      <div className={withGoal ? "grid gap-5 sm:grid-cols-[minmax(0,1fr)_14rem]" : undefined}>
        <div className="space-y-2">
          <Label htmlFor={ids.subject}>{t(`subject.${kind}`)}</Label>
          <Input
            ref={subjectRef}
            id={ids.subject}
            value={subject}
            maxLength={SUBJECT_MAX}
            placeholder={t(`subjectPlaceholder.${kind}`)}
            onChange={(e) => setSubject(e.target.value)}
            aria-invalid={subjectError ? true : undefined}
            aria-describedby={subjectError ? subjectErrorId : undefined}
          />
          {subjectError && (
            <p id={subjectErrorId} className="text-sm text-destructive">
              {subjectError}
            </p>
          )}
        </div>
        {withGoal && (
          <div className="space-y-2">
            <Label htmlFor={ids.goal}>{t("goal")}</Label>
            <Select
              value={goal}
              onValueChange={(value) => setGoal(value as DraftGoal)}
              items={Object.fromEntries(DRAFT_GOALS.map((g) => [g, t(`goals.${g}`)]))}
            >
              <SelectTrigger id={ids.goal} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DRAFT_GOALS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`goals.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={ids.details}>
          {t("details")}
          <span className="font-normal text-muted-foreground">{t("optional")}</span>
        </Label>
        <p id={ids.hint} className="text-sm text-muted-foreground">
          {t("detailsHint")}
        </p>
        <Textarea
          id={ids.details}
          rows={4}
          value={details}
          maxLength={DETAILS_MAX}
          onChange={(e) => setDetails(e.target.value)}
          aria-describedby={ids.hint}
        />
      </div>

      <Button type="submit" loading={pending}>
        {pending ? (
          t("submitting")
        ) : (
          <>
            <Sparkles data-icon="inline-start" aria-hidden="true" />
            {t("submit")}
          </>
        )}
      </Button>
    </form>
  );
}
