"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { completeMessengerConnection, disconnectMessenger } from "./actions";
import { loadFacebookSdk } from "./facebook-sdk";

export function MessengerConnection({
  clientServiceId,
  connected,
  pageName,
}: {
  clientServiceId: string;
  connected: boolean;
  pageName: string | null;
}) {
  const t = useTranslations("Dashboard.connectors");
  const [isPending, startTransition] = useTransition();

  function handleConnect() {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const configId = process.env.NEXT_PUBLIC_META_MESSENGER_CONFIG_ID;
    if (!appId || !configId) {
      toast.error(t("messenger.unavailable"));
      return;
    }

    startTransition(async () => {
      try {
        await loadFacebookSdk(appId);
        const response = await new Promise<{ authResponse?: { code?: string } }>(
          (resolve) => {
            window.FB!.login(resolve, {
              config_id: configId,
              response_type: "code",
              override_default_response_type: true,
            });
          }
        );

        const code = response.authResponse?.code;
        if (!code) return;

        unwrap(await completeMessengerConnection(clientServiceId, code));
        toast.success(t("messenger.connected"));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      try {
        unwrap(await disconnectMessenger(clientServiceId));
        toast.success(t("messenger.disconnected"));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  if (!connected) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleConnect}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />
        ) : (
          <MessageSquare aria-hidden="true" data-icon="inline-start" />
        )}
        {t("messenger.connect")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-foreground">
        <MessageSquare className="size-4 text-primary" aria-hidden="true" />
        {pageName ? t("messenger.statusWithName", { name: pageName }) : t("messenger.status")}
      </span>
      <Button
        variant="ghost"
        size="xs"
        onClick={handleDisconnect}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          t("disconnect")
        )}
      </Button>
    </div>
  );
}
