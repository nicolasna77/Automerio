"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Check, Copy, Image as ImageIcon, Pencil, Undo2, X } from "lucide-react";
import { toast } from "@/lib/toast";
import type { MarketingChannel, MarketingPostStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CHANNEL_RULES } from "@/lib/marketing/channels";
import { formatDate } from "@/lib/catalog";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import {
  approvePostAction,
  markPublishedAction,
  reopenPostAction,
  rejectPostAction,
  updatePostAction,
} from "./actions";

export type PostCardData = {
  id: string;
  channel: MarketingChannel;
  status: MarketingPostStatus;
  angle: string;
  body: string;
  imageBrief: string | null;
  warnings: string[];
  serviceName: string | null;
  publishedAt: Date | null;
};

export function PostCard({ post }: { post: PostCardData }) {
  const t = useTranslations("Admin.marketing");
  const tCommon = useTranslations("Common");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [pending, startTransition] = useTransition();

  const rule = CHANNEL_RULES[post.channel];
  const tooLong = draft.length > rule.maxChars;

  function run(action: () => Promise<void>, success: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(success);
      } catch (err) {
        toast.error(getErrorMessage(err, t("actionError")));
      }
    });
  }

  function handleSave() {
    run(async () => {
      unwrap(await updatePostAction(post.id, draft));
      setEditing(false);
    }, t("saved"));
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(post.body);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyError"));
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{rule.label}</Badge>
          {post.serviceName && <Badge variant="outline">{post.serviceName}</Badge>}
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {post.body.length} / {rule.maxChars}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground">{post.angle}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={12}
              aria-label={t("bodyLabel")}
              aria-invalid={tooLong || undefined}
            />
            <p className="text-xs tabular-nums text-muted-foreground">
              {draft.length} / {rule.maxChars}
              {tooLong && ` ${t("overLimit")}`}
            </p>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap text-foreground">{post.body}</p>
        )}

        {post.imageBrief && (
          <div className="flex gap-2 rounded-2xl bg-muted/50 p-3 text-sm text-muted-foreground">
            <ImageIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium text-foreground">{t("imageBrief")}</span>
              {post.imageBrief}
            </span>
          </div>
        )}

        {post.warnings.length > 0 && (
          <div className="flex gap-2 rounded-2xl border border-border p-3 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">{t("checkBefore")}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {post.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {post.publishedAt && (
          <p className="text-sm text-muted-foreground">
            {t("publishedOn", { date: formatDate(post.publishedAt) })}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button size="sm" onClick={handleSave} disabled={pending || tooLong}>
              {tCommon("save")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(post.body);
                setEditing(false);
              }}
              disabled={pending}
            >
              {tCommon("cancel")}
            </Button>
          </>
        ) : (
          <>
            {post.status === "DRAFT" && (
              <>
                <Button
                  size="sm"
                  onClick={() =>
                    run(() => approvePostAction(post.id, null), t("approved"))
                  }
                  disabled={pending}
                >
                  <Check data-icon="inline-start" />
                  {t("approve")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil data-icon="inline-start" />
                  {t("edit")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => run(() => rejectPostAction(post.id), t("rejected"))}
                  disabled={pending}
                >
                  <X data-icon="inline-start" />
                  {t("reject")}
                </Button>
              </>
            )}

            {post.status === "APPROVED" && (
              <>
                <Button size="sm" onClick={handleCopy}>
                  <Copy data-icon="inline-start" />
                  {t("copy")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    run(() => markPublishedAction(post.id), t("markedPublished"))
                  }
                  disabled={pending}
                >
                  {t("markPublished")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  <Pencil data-icon="inline-start" />
                  {t("edit")}
                </Button>
              </>
            )}

            {post.status === "PUBLISHED" && (
              <Button size="sm" variant="outline" onClick={handleCopy}>
                <Copy data-icon="inline-start" />
                {t("copy")}
              </Button>
            )}

            {post.status === "REJECTED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => run(() => reopenPostAction(post.id), t("reopened"))}
                disabled={pending}
              >
                <Undo2 data-icon="inline-start" />
                {t("reopen")}
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}
