"use client";

import { useTransition } from "react";
import { toast } from "sonner";
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
  const [isPending, startTransition] = useTransition();

  function handleConnect() {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const configId = process.env.NEXT_PUBLIC_META_MESSENGER_CONFIG_ID;
    if (!appId || !configId) {
      toast.error(
        "Connexion Facebook indisponible pour l'instant — contactez l'équipe Automerio."
      );
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
        toast.success("Page Facebook connectée.");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      try {
        unwrap(await disconnectMessenger(clientServiceId));
        toast.success("Page Facebook déconnectée.");
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
        Connecter ma Page Facebook
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-foreground">
        <MessageSquare className="size-4 text-primary" aria-hidden="true" />
        Page connectée{pageName ? ` (${pageName})` : ""}
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
          "Déconnecter"
        )}
      </Button>
    </div>
  );
}
