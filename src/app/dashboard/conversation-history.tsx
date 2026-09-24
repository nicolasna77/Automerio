import { ChevronDown, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConversations } from "@/lib/conversations";
import { cn } from "@/lib/utils";

function formatDateTime(date: Date): string {
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Ce que l'assistant a repondu, conversation par conversation. Des `details`
 * natifs plutot qu'un composant client : l'ouverture marche au clavier et au
 * lecteur d'ecran sans une ligne de JavaScript.
 */
export async function ConversationHistory({ clientServiceId }: { clientServiceId: string }) {
  const conversations = await getConversations(clientServiceId);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">
          Conversations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune conversation pour l&apos;instant. Les échanges de l&apos;assistant avec vos
            clients apparaîtront ici.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {conversations.map((conversation) => {
              const last = conversation.messages.at(-1);
              return (
                <li key={conversation.id}>
                  <details className="group rounded-2xl border border-border bg-card text-sm open:border-primary/30">
                    <summary className="flex cursor-pointer list-none items-start gap-2.5 rounded-2xl p-3 transition-colors hover:bg-muted/50 focus-visible:focus-ring [&::-webkit-details-marker]:hidden">
                      <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <span className="font-medium text-foreground tabular-nums">{conversation.contact}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatDateTime(conversation.lastMessageAt)} · {conversation.messageCount} message
                            {conversation.messageCount > 1 ? "s" : ""}
                          </span>
                        </span>
                        {last && (
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {last.direction === "OUTBOUND" ? "Assistant : " : ""}
                            {last.text}
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </summary>
                    <ol
                      aria-label={`Échanges avec ${conversation.contact}`}
                      className="space-y-2 border-t border-border px-3 pt-3 pb-4 sm:pl-9"
                    >
                      {conversation.messages.map((message) => (
                        <li
                          key={message.id}
                          className={cn("flex", message.direction === "OUTBOUND" ? "justify-end" : "justify-start")}
                        >
                          <p
                            className={cn(
                              "max-w-[85%] rounded-2xl px-3 py-2 leading-snug",
                              message.direction === "OUTBOUND"
                                ? "rounded-br-md bg-primary/10 text-foreground"
                                : "rounded-bl-md bg-muted text-foreground"
                            )}
                          >
                            <span className="sr-only">
                              {message.direction === "OUTBOUND" ? "Assistant : " : "Client : "}
                            </span>
                            {message.text}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
