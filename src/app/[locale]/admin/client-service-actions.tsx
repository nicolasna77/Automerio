"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, getErrorMessage } from "@/lib/utils";
import {
  markServiceActive,
  setExternalPhoneNumber,
  setFacebookPageId,
  setInstagramAccountId,
  setWhatsAppPhoneNumberId,
  updateServiceNote,
} from "./actions";

function InlineFieldEditor({
  id,
  label,
  value: initialValue,
  placeholder,
  inputClassName,
  successMessage,
  saveLabel,
  onSave,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  inputClassName?: string;
  successMessage: string;
  saveLabel: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await onSave(value);
        toast.success(successMessage);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          handleSave();
        }}
        placeholder={placeholder}
        className={cn("h-8 text-xs", inputClassName)}
        disabled={isPending}
      />
      <Button
        type="button"
        size="xs"
        variant="outline"
        onClick={handleSave}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          "OK"
        )}
        <span className="sr-only">{saveLabel}</span>
      </Button>
    </div>
  );
}

export function NoteEditor({
  clientServiceId,
  initialNote,
}: {
  clientServiceId: string;
  initialNote: string;
}) {
  return (
    <InlineFieldEditor
      id={`note-${clientServiceId}`}
      label="Note pour le client"
      value={initialNote}
      placeholder="Ex. Connexion de l'agenda en cours…"
      inputClassName="min-w-48"
      successMessage="Note enregistrée."
      saveLabel="Enregistrer la note"
      onSave={(value) => updateServiceNote(clientServiceId, value)}
    />
  );
}

export function PhoneNumberEditor({
  clientServiceId,
  initialPhoneNumber,
}: {
  clientServiceId: string;
  initialPhoneNumber: string;
}) {
  return (
    <InlineFieldEditor
      id={`phone-${clientServiceId}`}
      label="Numéro Twilio"
      value={initialPhoneNumber}
      placeholder="+33…"
      inputClassName="min-w-36"
      successMessage="Numéro enregistré."
      saveLabel="Enregistrer le numéro"
      onSave={(value) => setExternalPhoneNumber(clientServiceId, value)}
    />
  );
}

export function WhatsAppPhoneNumberEditor({
  clientServiceId,
  initialPhoneNumberId,
}: {
  clientServiceId: string;
  initialPhoneNumberId: string;
}) {
  return (
    <InlineFieldEditor
      id={`whatsapp-${clientServiceId}`}
      label="Phone Number ID Meta"
      value={initialPhoneNumberId}
      placeholder="ex. 109876543210987"
      inputClassName="min-w-36"
      successMessage="Numéro WhatsApp connecté."
      saveLabel="Enregistrer le numéro"
      onSave={(value) => setWhatsAppPhoneNumberId(clientServiceId, value)}
    />
  );
}

export function FacebookPageIdEditor({
  clientServiceId,
  initialPageId,
}: {
  clientServiceId: string;
  initialPageId: string;
}) {
  return (
    <InlineFieldEditor
      id={`facebook-${clientServiceId}`}
      label="ID de la Page Facebook"
      value={initialPageId}
      placeholder="ex. 109876543210987"
      inputClassName="min-w-36"
      successMessage="Page Facebook connectée."
      saveLabel="Enregistrer la Page"
      onSave={(value) => setFacebookPageId(clientServiceId, value)}
    />
  );
}

export function InstagramAccountIdEditor({
  clientServiceId,
  initialAccountId,
}: {
  clientServiceId: string;
  initialAccountId: string;
}) {
  return (
    <InlineFieldEditor
      id={`instagram-${clientServiceId}`}
      label="ID du compte Instagram"
      value={initialAccountId}
      placeholder="ex. 17841400000000000"
      inputClassName="min-w-36"
      successMessage="Compte Instagram connecté."
      saveLabel="Enregistrer le compte"
      onSave={(value) => setInstagramAccountId(clientServiceId, value)}
    />
  );
}

export function MarkActiveButton({
  clientServiceId,
}: {
  clientServiceId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleActivate() {
    startTransition(async () => {
      try {
        await markServiceActive(clientServiceId);
        toast.success("Solution marquée active.");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleActivate}
      disabled={isPending}
      aria-busy={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />
          Activation…
        </>
      ) : (
        "Marquer active"
      )}
    </Button>
  );
}
