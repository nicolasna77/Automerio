"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { CalendarCheck2, ExternalLink } from "lucide-react";
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

// Où trouver la clé dans chaque outil (textes dans Dashboard.connectors).
const PROVIDER_URLS: Record<SchedulingProvider, string> = {
  calcom: "https://app.cal.com/settings/developer/api-keys",
  calendly: "https://calendly.com/integrations/api_webhooks",
};

export function CalendarConnection({
  clientServiceId,
  calendar,
  fromSettings = false,
}: {
  clientServiceId: string;
  calendar: MyServiceDTO["calendar"];
  // Après Google, revenir sur l'onglet Connecteurs des réglages.
  fromSettings?: boolean;
}) {
  const t = useTranslations("Dashboard.connectors");
  const [isPending, startTransition] = useTransition();
  const [dialogFor, setDialogFor] = useState<SchedulingProvider | null>(null);

  if (calendar) {
    function handleDisconnect() {
      startTransition(async () => {
        try {
          unwrap(await disconnectCalendar(clientServiceId));
          toast.success(t("calendar.disconnected"));
        } catch (err) {
          toast.error(getErrorMessage(err));
        }
      });
    }

    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <CalendarCheck2 className="size-4 text-primary" aria-hidden="true" />
          {t("calendar.connected", { provider: PROVIDER_LABELS[calendar.provider] })}
          {calendar.eventTypeName && (
            <span className="text-muted-foreground">{t("calendar.eventType", { name: calendar.eventTypeName })}</span>
          )}
        </span>
        <span className="text-muted-foreground">{calendar.account}</span>
        <Button
          variant="ghost"
          size="xs"
          onClick={handleDisconnect}
          loading={isPending}
        >
          {!isPending && t("disconnect")}
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
          render={
            <a
              href={`/api/google-calendar/connect?clientServiceId=${clientServiceId}${fromSettings ? "&from=settings" : ""}`}
            />
          }
        >
          <CalendarCheck2 aria-hidden="true" data-icon="inline-start" />
          {t("calendar.google")}
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
  const t = useTranslations("Dashboard.connectors.calendar");
  const id = useId();
  const providerName = PROVIDER_LABELS[provider];
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
        toast.success(t("connectedToast", { provider: providerName }));
        onDone();
      } catch (err) {
        setError(getErrorMessage(err));
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("dialogTitle", { provider: providerName })}</DialogTitle>
        <DialogDescription>{t("dialogDescription", { provider: providerName })}</DialogDescription>
      </DialogHeader>

      {account === null ? (
        <div className="space-y-2">
          <Label htmlFor={`${id}-token`}>{t(`providers.${provider}.keyLabel`)}</Label>
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
            {t(`providers.${provider}.where`)}{" "}
            <a
              href={PROVIDER_URLS[provider]}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 underline underline-offset-4 hover:text-foreground"
            >
              {t("open", { provider: providerName })}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </p>
          {provider === "calendly" && (
            <p className="text-xs text-muted-foreground">{t("providers.calendly.note")}</p>
          )}
        </div>
      ) : (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-foreground">
            {t("chooseEventType")}
          </legend>
          <p className="text-xs text-muted-foreground">{t("account", { account: account.accountLabel })}</p>
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
                  {t("minutes", { minutes: eventType.durationMinutes })}
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
          <Button onClick={handleCheck} disabled={!token.trim()} loading={isPending}>
            {t("check")}
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => setAccount(null)} disabled={isPending}>
              {t("changeKey")}
            </Button>
            <Button onClick={handleConnect} disabled={!eventTypeId} loading={isPending}>
              {t("connect")}
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}
