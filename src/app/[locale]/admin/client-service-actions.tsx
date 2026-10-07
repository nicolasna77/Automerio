"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
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

type EditorKey = "noteEditor" | "phone" | "whatsapp" | "facebook" | "instagram";

function InlineFieldEditor({
  id,
  messages,
  value: initialValue,
  inputClassName,
  onSave,
}: {
  id: string;
  messages: EditorKey;
  value: string;
  inputClassName?: string;
  onSave: (value: string) => Promise<void>;
}) {
  const t = useTranslations("Admin.clientService");
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await onSave(value);
        toast.success(t(`${messages}.saved`));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <label className="sr-only" htmlFor={id}>
        {t(`${messages}.label`)}
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
        placeholder={t(`${messages}.placeholder`)}
        className={cn("h-8 text-xs", inputClassName)}
        disabled={isPending}
      />
      <Button
        type="button"
        size="xs"
        variant="outline"
        onClick={handleSave}
        loading={isPending}
      >
        {!isPending && t("ok")}
        <span className="sr-only">{t(`${messages}.save`)}</span>
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
      messages="noteEditor"
      value={initialNote}
      inputClassName="min-w-48"
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
      messages="phone"
      value={initialPhoneNumber}
      inputClassName="min-w-36"
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
      messages="whatsapp"
      value={initialPhoneNumberId}
      inputClassName="min-w-36"
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
      messages="facebook"
      value={initialPageId}
      inputClassName="min-w-36"
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
      messages="instagram"
      value={initialAccountId}
      inputClassName="min-w-36"
      onSave={(value) => setInstagramAccountId(clientServiceId, value)}
    />
  );
}

export function MarkActiveButton({
  clientServiceId,
}: {
  clientServiceId: string;
}) {
  const t = useTranslations("Admin.clientService");
  const [isPending, startTransition] = useTransition();

  function handleActivate() {
    startTransition(async () => {
      try {
        await markServiceActive(clientServiceId);
        toast.success(t("markedActive"));
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
      loading={isPending}
    >
      {isPending ? t("activating") : t("markActive")}
    </Button>
  );
}
