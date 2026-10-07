"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { replyToHelpRequest } from "./actions";

export function HelpRequestReplyForm({
  helpRequestId,
  resolved,
}: {
  helpRequestId: string;
  resolved: boolean;
}) {
  const t = useTranslations("Dashboard.help.reply");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      try {
        unwrap(await replyToHelpRequest(helpRequestId, body));
        toast.success(
          resolved ? t("reopened") : t("sent")
        );
        setBody("");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="mt-4 space-y-2">
      <label className="sr-only" htmlFor={`reply-${helpRequestId}`}>
        {t("label")}
      </label>
      <Textarea
        id={`reply-${helpRequestId}`}
        rows={3}
        placeholder={resolved ? t("reopenPlaceholder") : t("placeholder")}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={isPending}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleSubmit}
        disabled={isPending || !body.trim()}
        aria-busy={isPending}
      >
        {isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />
        ) : (
          <Send aria-hidden="true" data-icon="inline-start" />
        )}
        {t("send")}
      </Button>
    </div>
  );
}
