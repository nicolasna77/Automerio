import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/catalog";
import { HELP_REQUEST_STATUS_LABELS, type HelpRequestDTO } from "@/lib/help";
import { HelpRequestThread } from "@/components/help-request-thread";
import { HelpRequestReplyForm } from "./help-request-reply-form";

export function HelpRequestHistory({ items }: { items: HelpRequestDTO[] }) {
  return (
    <section aria-labelledby="help-history-heading" className="mt-10">
      <h2
        id="help-history-heading"
        className="mb-4 text-lg font-semibold text-foreground"
      >
        Vos demandes
      </h2>

      {items.length === 0 ? (
        <div className="flex items-center gap-4 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageCircle className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-foreground">
              Vous n&apos;avez pas encore contacté l&apos;équipe
            </p>
            <p className="text-sm text-muted-foreground">
              Vos demandes s&apos;affichent ici une fois envoyées.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.id} className="shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {item.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.service ? item.service.name : "Question générale"}
                      {" · "}
                      {item.resolvedAt
                        ? `Traité le ${formatDate(item.resolvedAt)}`
                        : `Envoyée le ${formatDate(item.createdAt)}`}
                    </p>
                  </div>
                  <Badge
                    variant={item.status === "OPEN" ? "outline" : "secondary"}
                    className="shrink-0"
                  >
                    {HELP_REQUEST_STATUS_LABELS[item.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {item.message}
                </p>
                <HelpRequestThread messages={item.messages} />
                <HelpRequestReplyForm
                  helpRequestId={item.id}
                  resolved={item.status === "RESOLVED"}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
