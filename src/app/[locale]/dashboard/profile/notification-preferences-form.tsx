"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/utils";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_DESCRIPTIONS,
  NOTIFICATION_TYPE_LABELS,
  type NotificationType,
} from "@/lib/email/types";
import type { NotificationPreferences } from "@/lib/email/preferences";
import { setNotificationPreference } from "./actions";
import { ProfileSection } from "./profile-section";

export function NotificationPreferencesForm({
  initialPreferences,
}: {
  initialPreferences: NotificationPreferences;
}) {
  return (
    <ProfileSection
      title="E-mails que nous vous envoyons"
      description="Les e-mails liés à votre compte et à vos paiements vous parviennent dans tous les cas."
      action={
        <p className="pt-1 text-xs text-muted-foreground">
          Enregistré automatiquement
        </p>
      }
    >
      <ul className="divide-y divide-border rounded-2xl border border-border">
        {NOTIFICATION_TYPES.map((type) => (
          <NotificationToggleRow
            key={type}
            type={type}
            initialEnabled={initialPreferences[type] !== false}
          />
        ))}
      </ul>
    </ProfileSection>
  );
}

function NotificationToggleRow({
  type,
  initialEnabled,
}: {
  type: NotificationType;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    const previous = enabled;
    setEnabled(checked);
    startTransition(async () => {
      try {
        await setNotificationPreference(type, checked);
      } catch (err) {
        setEnabled(previous);
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {NOTIFICATION_TYPE_LABELS[type]}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {NOTIFICATION_TYPE_DESCRIPTIONS[type]}
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={handleChange}
        disabled={isPending}
        aria-label={NOTIFICATION_TYPE_LABELS[type]}
      />
    </li>
  );
}
