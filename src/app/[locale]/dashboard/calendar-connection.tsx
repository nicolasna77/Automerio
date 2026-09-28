"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CalendarCheck2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { disconnectGoogleCalendar } from "./actions";

export function CalendarConnection({
  clientServiceId,
  connected,
}: {
  clientServiceId: string;
  connected: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (!connected) {
    return (
      <Button
        variant="outline"
        size="sm"
        render={<a href={`/api/google-calendar/connect?clientServiceId=${clientServiceId}`} />}
      >
        <CalendarCheck2 aria-hidden="true" data-icon="inline-start" />
        Connecter Google Calendar
      </Button>
    );
  }

  function handleDisconnect() {
    startTransition(async () => {
      try {
        unwrap(await disconnectGoogleCalendar(clientServiceId));
        toast.success("Agenda déconnecté.");
      } catch (err) {
        toast.error(
          getErrorMessage(err)
        );
      }
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-foreground">
        <CalendarCheck2 className="size-4 text-primary" aria-hidden="true" />
        Agenda Google connecté
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
