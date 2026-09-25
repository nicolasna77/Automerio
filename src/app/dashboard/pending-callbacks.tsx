import Link from "next/link";
import { Phone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { countPendingCallbacks, listPendingCallbacks } from "@/lib/call-callbacks";
import { MarkHandledButton } from "./mark-handled-button";

function formatDateTime(date: Date): string {
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    // Rendu cote serveur, en UTC sur Vercel : l'heure doit etre celle du client.
    timeZone: "Europe/Paris",
  });
}

/**
 * Les appels qui attendent un rappel, en tete du tableau de bord : c'est la
 * premiere chose a faire en revenant d'un chantier. Rien ne s'affiche quand il
 * n'y en a aucun.
 */
export async function PendingCallbacks({ organizationId }: { organizationId: string }) {
  const [callbacks, total] = await Promise.all([
    listPendingCallbacks(organizationId),
    countPendingCallbacks(organizationId),
  ]);
  if (callbacks.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">
          Appels à rappeler
        </CardTitle>
        <CardDescription>
          {total === 1
            ? "Un appel attend un geste de votre part."
            : `${total} appels attendent un geste de votre part.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {callbacks.map((callback) => {
            const who = callback.callerName ?? callback.fromNumber ?? "Numéro masqué";
            return (
              <li key={callback.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{callback.reason ?? who}</p>
                  <p className="mt-0.5 text-sm text-foreground">{callback.followUp}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {callback.reason ? `${who} · ` : ""}
                    <Link
                      href={`/dashboard/services/${callback.clientServiceId}`}
                      className="underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {callback.serviceName}
                    </Link>{" "}
                    · {formatDateTime(callback.occurredAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {callback.fromNumber && (
                    <a href={`tel:${callback.fromNumber}`} className={buttonVariants({ size: "sm" })}>
                      <Phone aria-hidden="true" data-icon="inline-start" />
                      Rappeler
                    </a>
                  )}
                  <MarkHandledButton
                    clientServiceId={callback.clientServiceId}
                    callId={callback.id}
                    label={callback.reason ?? who}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        {total > callbacks.length && (
          <p className="mt-3 text-xs text-muted-foreground">
            Les autres se trouvent sur la page de chaque solution.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
