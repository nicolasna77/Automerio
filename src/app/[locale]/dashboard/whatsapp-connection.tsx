"use client";

import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { completeWhatsAppEmbeddedSignup, disconnectWhatsApp } from "./actions";
import { loadFacebookSdk } from "./facebook-sdk";

type EmbeddedSignupData = { phoneNumberId: string; wabaId: string };

export function WhatsAppConnection({
  clientServiceId,
  connected,
  displayNumber,
}: {
  clientServiceId: string;
  connected: boolean;
  displayNumber: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const signupDataRef = useRef<EmbeddedSignupData | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.origin.endsWith("facebook.com")) return;

      let parsed: unknown;
      try {
        parsed = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      const payload = parsed as {
        type?: string;
        event?: string;
        data?: { phone_number_id?: string; waba_id?: string };
      };
      if (payload.type !== "WA_EMBEDDED_SIGNUP") return;
      if (
        payload.event?.startsWith("FINISH") &&
        payload.data?.phone_number_id &&
        payload.data?.waba_id
      ) {
        signupDataRef.current = {
          phoneNumberId: payload.data.phone_number_id,
          wabaId: payload.data.waba_id,
        };
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function handleConnect() {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const configId = process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID;
    if (!appId || !configId) {
      toast.error(
        "Connexion WhatsApp indisponible pour l'instant — contactez l'équipe Automerio."
      );
      return;
    }

    startTransition(async () => {
      signupDataRef.current = null;
      try {
        await loadFacebookSdk(appId);
        const response = await new Promise<{ authResponse?: { code?: string } }>(
          (resolve) => {
            window.FB!.login(resolve, {
              config_id: configId,
              response_type: "code",
              override_default_response_type: true,
              extras: { setup: {} },
            });
          }
        );

        const code = response.authResponse?.code;
        const signupData = signupDataRef.current as EmbeddedSignupData | null;
        if (!code || !signupData) return;

        unwrap(
          await completeWhatsAppEmbeddedSignup(
            clientServiceId,
            code,
            signupData.wabaId,
            signupData.phoneNumberId
          )
        );
        toast.success("Compte WhatsApp connecté.");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      try {
        unwrap(await disconnectWhatsApp(clientServiceId));
        toast.success("Compte WhatsApp déconnecté.");
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
          <MessageCircle aria-hidden="true" data-icon="inline-start" />
        )}
        Connecter mon compte WhatsApp
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-foreground">
        <MessageCircle className="size-4 text-primary" aria-hidden="true" />
        WhatsApp connecté{displayNumber ? ` (${displayNumber})` : ""}
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
