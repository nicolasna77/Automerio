import type { PendingInboundMessage } from "@/lib/inbound-message-guard";

// Commentaires reçus sur les publications Instagram du client (webhook,
// champ « comments ») : chacun devient un message entrant, et l'assistant
// répond en message privé adressé au commentaire (« private reply » de Meta,
// une seule fois par commentaire). Activé par INSTAGRAM_COMMENT_REPLIES=on,
// une fois la permission instagram_business_manage_comments accordée par
// Meta, puis par solution (réglage « Réponse aux commentaires »).

export function commentRepliesEnabled(): boolean {
  return process.env.INSTAGRAM_COMMENT_REPLIES === "on";
}

export function repliesToComments(configuration: Record<string, unknown>): boolean {
  return configuration.commentReplies === "on";
}

type CommentChange = {
  field?: string;
  value?: {
    id?: string;
    text?: string;
    parent_id?: string;
    from?: { id?: string };
  };
};

export type InstagramCommentPayload = {
  entry?: { id?: string; changes?: CommentChange[] }[];
};

// Commentaires de premier niveau, écrits par quelqu'un d'autre que le compte :
// une réponse à un commentaire ou un commentaire du client lui-même n'appelle
// pas de message privé. externalId = identifiant du commentaire (destinataire
// de la réponse privée, et clé anti-doublon si Meta relivre l'envoi).
export function parseInstagramComments(payload: InstagramCommentPayload): PendingInboundMessage[] {
  const comments: PendingInboundMessage[] = [];
  for (const entry of payload.entry ?? []) {
    const accountId = entry.id;
    if (!accountId) continue;
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;
      const value = change.value;
      const authorId = value?.from?.id;
      const text = value?.text?.trim();
      if (!value?.id || !authorId || !text || value.parent_id || authorId === accountId) continue;
      comments.push({ accountId, contactId: authorId, text, externalId: value.id });
    }
  }
  return comments;
}
