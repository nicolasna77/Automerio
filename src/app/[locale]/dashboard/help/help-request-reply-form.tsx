"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      try {
        unwrap(await replyToHelpRequest(helpRequestId, body));
        toast.success(
          resolved
            ? "Message envoyé — votre demande est rouverte."
            : "Message envoyé à l'équipe Automerio."
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
        Répondre à l&apos;équipe Automerio
      </label>
      <Textarea
        id={`reply-${helpRequestId}`}
        rows={3}
        placeholder={
          resolved
            ? "Une question de plus ? Écrivez ici pour rouvrir la demande…"
            : "Ajouter une précision, relancer…"
        }
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
        Envoyer
      </Button>
    </div>
  );
}
