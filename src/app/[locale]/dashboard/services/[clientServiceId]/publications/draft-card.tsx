"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Copy, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { draftToText, type DraftContent } from "@/lib/instagram-drafts/content";
import { deleteInstagramDraft } from "./actions";

export type DraftCardData = {
  id: string;
  subject: string;
  draft: DraftContent;
  warnings: string[];
  createdOn: string;
  authorName: string | null;
};

export function DraftCard({ data }: { data: DraftCardData }) {
  const t = useTranslations("Dashboard.instagramDrafts");
  const tCommon = useTranslations("Common");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  async function handleCopy() {
    const text = draftToText(data.draft, {
      slide: (number) => t("history.slide", { number }),
      stories: t("history.stories"),
      day: (d) =>
        t("history.dayLine", {
          day: d.day,
          format: t(`history.formats.${d.format}`),
          time: d.time,
          angle: d.angle,
          hook: d.hook,
        }),
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("history.copied"));
    } catch {
      toast.error(t("history.copyError"));
    }
  }

  function handleDelete() {
    startDelete(async () => {
      try {
        unwrap(await deleteInstagramDraft(data.id));
        setConfirmDelete(false);
        toast.success(t("history.deleted"));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{t(`kinds.${data.draft.kind}`)}</Badge>
          <span className="text-[13px] text-muted-foreground">
            {data.authorName
              ? t("history.by", { date: data.createdOn, name: data.authorName })
              : t("history.byUnknown", { date: data.createdOn })}
          </span>
        </div>
        <h3 className="font-medium text-pretty text-foreground [overflow-wrap:anywhere]">{data.subject}</h3>
      </CardHeader>

      <CardContent className="space-y-4">
        {data.warnings.length > 0 && (
          <div className="flex gap-2 rounded-lg border border-attention/40 bg-attention/5 p-3 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-attention" aria-hidden="true" />
            <p>{t("history.checkNumbers", { numbers: data.warnings.join(", ") })}</p>
          </div>
        )}
        <DraftBody draft={data.draft} />
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleCopy}>
          <Copy data-icon="inline-start" aria-hidden="true" />
          {t("history.copy")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          aria-label={t("history.deleteLabel", { subject: data.subject })}
        >
          <Trash2 data-icon="inline-start" aria-hidden="true" />
          {t("history.delete")}
        </Button>
      </CardFooter>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("history.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("history.confirmDescription", { subject: data.subject })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} loading={deleting}>
              {t("history.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function Hashtags({ tags }: { tags: string[] }) {
  const t = useTranslations("Dashboard.instagramDrafts.history");
  if (tags.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{t("hashtags")}</p>
      <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">{tags.join(" ")}</p>
    </div>
  );
}

function DraftBody({ draft }: { draft: DraftContent }) {
  const t = useTranslations("Dashboard.instagramDrafts");
  switch (draft.kind) {
    case "CAPTION": {
      const { hook, body, cta, hashtags } = draft.content;
      return (
        <div className="space-y-3 text-sm leading-relaxed whitespace-pre-line text-foreground">
          <p className="font-medium">{hook}</p>
          <p>{body}</p>
          <p>{cta}</p>
          <Hashtags tags={hashtags} />
        </div>
      );
    }
    case "CAROUSEL": {
      const { slides, caption, hashtags } = draft.content;
      return (
        <div className="space-y-4">
          <ol aria-label={t("history.slides")} className="space-y-3">
            {slides.map((slide, index) => (
              <li key={index} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-medium text-primary tabular-nums"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-foreground">{slide.title}</p>
                  <p className="mt-0.5 text-muted-foreground">{slide.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div>
            <p className="text-sm font-medium text-foreground">{t("history.caption")}</p>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-foreground">{caption}</p>
          </div>
          <Hashtags tags={hashtags} />
        </div>
      );
    }
    case "HASHTAGS":
      return (
        <ul className="divide-y divide-border">
          {draft.content.tags.map((tag) => (
            <li key={tag.tag} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm first:pt-0 last:pb-0">
              <span className="font-mono text-foreground">{tag.tag}</span>
              <Badge variant="outline">{t(`history.tiers.${tag.tier}`)}</Badge>
              <span className="basis-full text-muted-foreground sm:basis-auto">{tag.why}</span>
            </li>
          ))}
        </ul>
      );
    case "WEEKLY_PLAN":
      return (
        <div className="space-y-4">
          <ul className="divide-y divide-border">
            {draft.content.days.map((day, index) => (
              <li key={index} className="grid gap-1 py-3 text-sm first:pt-0 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
                <div>
                  <p className="font-medium text-foreground first-letter:uppercase">{day.day}</p>
                  <p className="text-muted-foreground">
                    {t(`history.formats.${day.format}`)} · <span className="font-mono tabular-nums">{day.time}</span>
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-foreground">{day.angle}</p>
                  <p className="mt-0.5 text-muted-foreground">{day.hook}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {t("history.planGoal", { goal: t(`composer.goals.${day.goal}`) })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div>
            <p className="text-sm font-medium text-foreground">{t("history.storiesTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{draft.content.stories}</p>
          </div>
        </div>
      );
  }
}
