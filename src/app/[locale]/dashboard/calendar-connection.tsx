"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarCheck2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unwrap } from "@/lib/action-result";
import { cn, getErrorMessage } from "@/lib/utils";
import type { MyServiceDTO } from "@/lib/catalog";
import {
  PROVIDER_LABELS,
  type ProviderAccount,
  type SchedulingProvider,
} from "@/lib/scheduling/types";
import { connectSchedulingTool, disconnectCalendar, previewSchedulingAccount } from "./actions";

// Où trouver la clé dans chaque outil, et ce qu'il faut savoir avant.
const PROVIDER_HELP: Record<
  SchedulingProvider,
  { keyLabel: string; where: string; url: string; note?: string }
> = {
  calcom: {
    keyLabel: "Clé API Cal.com",
    where: "Dans Cal.com : Paramètres, Développeur, Clés API. Créez une clé sans date d'expiration.",
    url: "https://app.cal.com/settings/developer/api-keys",
  },
  calendly: {
    keyLabel: "Jeton d'accès personnel Calendly",
    where: "Dans Calendly : Intégrations et applications, API et webhooks, Jetons d'accès personnels.",
    url: "https://calendly.com/integrations/api_webhooks",
    note: "La réservation par un assistant demande une offre Calendly payante (Standard ou plus).",
  },
};

export function CalendarConnection({
  clientServiceId,
  calendar,
}: {
  clientServiceId: string;
  calendar: MyServiceDTO["calendar"];
}) {
  const [isPending, startTransition] = useTransition();
  const [dialogFor, setDialogFor] = useState<SchedulingProvider | null>(null);

  if (calendar) {
    function handleDisconnect() {
      startTransition(async () => {
        try {
          unwrap(await disconnectCalendar(clientServiceId));
          toast.success("Agenda déconnecté.");
        } catch (err) {
          toast.error(getErrorMessage(err));
        }
      });
    }

    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <CalendarCheck2 className="size-4 text-primary" aria-hidden="true" />
          {PROVIDER_LABELS[calendar.provider]} connecté
          {calendar.eventTypeName && (
            <span className="text-muted-foreground">: {calendar.eventTypeName}</span>
          )}
        </span>
        <span className="text-muted-foreground">{calendar.account}</span>
        <Button
          variant="ghost"
          size="xs"
          onClick={handleDisconnect}
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : "Déconnecter"}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={`/api/google-calendar/connect?clientServiceId=${clientServiceId}`} />}
        >
          <CalendarCheck2 aria-hidden="true" data-icon="inline-start" />
          Google Agenda
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDialogFor("calcom")}>
          Cal.com
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDialogFor("calendly")}>
          Calendly
        </Button>
      </div>

      <Dialog open={dialogFor !== null} onOpenChange={(open) => !open && setDialogFor(null)}>
        <DialogContent>
          {dialogFor && (
            <SchedulingDialog
              key={dialogFor}
              clientServiceId={clientServiceId}
              provider={dialogFor}
              onDone={() => setDialogFor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// En deux temps : la clé est vérifiée et les types de rendez-vous listés,
// puis le client choisit celui que l'assistant réservera.
function SchedulingDialog({
  clientServiceId,
  provider,
  onDone,
}: {
  clientServiceId: string;
  provider: SchedulingProvider;
  onDone: () => void;
}) {
  const id = useId();
  const help = PROVIDER_HELP[provider];
  const [token, setToken] = useState("");
  const [account, setAccount] = useState<ProviderAccount | null>(null);
  const [eventTypeId, setEventTypeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCheck() {
    setError(null);
    startTransition(async () => {
      try {
        const result = unwrap(await previewSchedulingAccount(clientServiceId, provider, token));
        setAccount(result);
        setEventTypeId(result.eventTypes.length === 1 ? result.eventTypes[0].id : null);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    });
  }

  function handleConnect() {
    if (!eventTypeId) return;
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await connectSchedulingTool(clientServiceId, provider, token, eventTypeId));
        toast.success(`${PROVIDER_LABELS[provider]} connecté.`);
        onDone();
      } catch (err) {
        setError(getErrorMessage(err));
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Connecter {PROVIDER_LABELS[provider]}</DialogTitle>
        <DialogDescription>
          L&apos;assistant vérifie vos créneaux et réserve directement dans{" "}
          {PROVIDER_LABELS[provider]}. Votre clé est chiffrée avant d&apos;être enregistrée.
        </DialogDescription>
      </DialogHeader>

      {account === null ? (
        <div className="space-y-2">
          <Label htmlFor={`${id}-token`}>{help.keyLabel}</Label>
          <Input
            id={`${id}-token`}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && token.trim()) handleCheck();
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
            disabled={isPending}
          />
          <p id={`${id}-help`} className="text-xs text-muted-foreground">
            {help.where}{" "}
            <a
              href={help.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 underline underline-offset-4 hover:text-foreground"
            >
              Ouvrir {PROVIDER_LABELS[provider]}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </p>
          {help.note && <p className="text-xs text-muted-foreground">{help.note}</p>}
        </div>
      ) : (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-foreground">
            Quel rendez-vous l&apos;assistant doit-il réserver ?
          </legend>
          <p className="text-xs text-muted-foreground">Compte : {account.accountLabel}</p>
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {account.eventTypes.map((eventType) => (
              <label
                key={eventType.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                  eventTypeId === eventType.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name={`${id}-event-type`}
                    value={eventType.id}
                    checked={eventTypeId === eventType.id}
                    onChange={() => setEventTypeId(eventType.id)}
                    className="accent-primary"
                  />
                  {eventType.name}
                </span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {eventType.durationMinutes} min
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        {account === null ? (
          <Button onClick={handleCheck} disabled={!token.trim() || isPending} aria-busy={isPending}>
            {isPending && <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />}
            Vérifier la clé
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => setAccount(null)} disabled={isPending}>
              Changer de clé
            </Button>
            <Button onClick={handleConnect} disabled={!eventTypeId || isPending} aria-busy={isPending}>
              {isPending && <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />}
              Connecter
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}
