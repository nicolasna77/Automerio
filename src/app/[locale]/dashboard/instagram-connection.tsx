"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { disconnectInstagram } from "./actions";

export function InstagramConnection({
  clientServiceId,
  connected,
  username,
}: {
  clientServiceId: string;
  connected: boolean;
  username: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  if (!connected) {
    return (
      <Button
        variant="outline"
        size="sm"
        render={<a href={`/api/instagram/connect?clientServiceId=${clientServiceId}`} />}
      >
        <Camera aria-hidden="true" data-icon="inline-start" />
        Connecter mon compte Instagram
      </Button>
    );
  }

  function handleDisconnect() {
    startTransition(async () => {
      try {
        unwrap(await disconnectInstagram(clientServiceId));
        toast.success("Compte Instagram déconnecté.");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-foreground">
        <Camera className="size-4 text-primary" aria-hidden="true" />
        Compte connecté{username ? ` (@${username})` : ""}
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
