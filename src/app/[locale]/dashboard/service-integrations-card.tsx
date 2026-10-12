"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Copy, Eye, EyeOff, Send, Trash2, Webhook } from "lucide-react";
import { toast } from "@/lib/toast";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { INTEGRATIONS_SECTION_ID } from "./billing-section";
import { ManagersOnlyNote } from "./managers-only-note";
import { removeWebhookAction, saveWebhookAction, sendTestWebhookAction } from "./webhook-actions";

// Noms techniques des événements, identiques dans toutes les langues.
const CALL_EVENT = "call.completed";
const BOOKING_EVENT = "booking.created";

// Onglet « Intégrations » des réglages : le webhook sortant qui envoie chaque
// appel terminé et chaque réservation vers l'outil du client (Zapier, Make,
// CRM). Le secret de signature n'est transmis qu'aux responsables.
export function ServiceIntegrationsCard({
  clientServiceId,
  webhookUrl,
  webhookSecret,
  canManage,
}: {
  clientServiceId: string;
  webhookUrl: string | null;
  webhookSecret: string | null;
  canManage: boolean;
}) {
  const t = useTranslations("Dashboard.settingsCards.integrations");
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(webhookUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();
  const [removing, startRemove] = useTransition();

  function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startSave(async () => {
      try {
        unwrap(await saveWebhookAction(clientServiceId, url));
        toast.success(t("saved"));
      } catch (err) {
        setError(getErrorMessage(err));
        inputRef.current?.focus();
      }
    });
  }

  function handleTest() {
    startTest(async () => {
      try {
        const { status } = unwrap(await sendTestWebhookAction(clientServiceId));
        toast.success(t("testOk", { status: status ?? "" }));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  function handleRemove() {
    startRemove(async () => {
      try {
        unwrap(await removeWebhookAction(clientServiceId));
        setUrl("");
        setConfirmRemove(false);
        toast.success(t("removed"));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  async function copySecret() {
    if (!webhookSecret) return;
    try {
      await navigator.clipboard.writeText(webhookSecret);
      toast.success(t("secretCopied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <Card id={INTEGRATIONS_SECTION_ID} className="scroll-mt-24">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Webhook className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle as="h2" className="text-base">
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!canManage ? (
          <>
            <p className="text-sm text-muted-foreground">{webhookUrl ? t("statusOn") : t("statusOff")}</p>
            <ManagersOnlyNote />
          </>
        ) : (
          <>
            <form onSubmit={handleSave} noValidate className="space-y-2">
              <Label htmlFor={inputId}>{t("urlLabel")}</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  ref={inputRef}
                  id={inputId}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={t("urlPlaceholder")}
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  disabled={saving}
                  className="font-mono text-sm"
                />
                <Button type="submit" loading={saving} className="shrink-0">
                  {t("save")}
                </Button>
              </div>
              {error ? (
                <p id={errorId} role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("urlHelp")}</p>
              )}
            </form>

            {webhookUrl && webhookSecret && (
              <div className="space-y-4 rounded-lg border border-border p-4">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-foreground">{t("secretLabel")}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="min-w-0 flex-1 rounded-md bg-muted px-2 py-1.5 font-mono text-xs [overflow-wrap:anywhere] text-foreground">
                      {showSecret ? webhookSecret : "•".repeat(32)}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={showSecret ? t("hideSecret") : t("showSecret")}
                      onClick={() => setShowSecret((value) => !value)}
                    >
                      {showSecret ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={t("copySecret")} onClick={copySecret}>
                      <Copy aria-hidden="true" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("secretHelp")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" loading={testing} onClick={handleTest}>
                    {!testing && <Send aria-hidden="true" data-icon="inline-start" />}
                    {t("test")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setConfirmRemove(true)}>
                    <Trash2 aria-hidden="true" data-icon="inline-start" />
                    {t("remove")}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{t("eventsTitle")}</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <code className="font-mono text-xs">{CALL_EVENT}</code> {t("eventCall")}
                </li>
                <li>
                  <code className="font-mono text-xs">{BOOKING_EVENT}</code> {t("eventBooking")}
                </li>
              </ul>
              <p>{t("signatureHelp")}</p>
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("removeDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <Button type="button" variant="destructive" loading={removing} onClick={handleRemove}>
              {t("removeConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
