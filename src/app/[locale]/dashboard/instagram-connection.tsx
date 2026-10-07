"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Camera } from "lucide-react";
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
  const t = useTranslations("Dashboard.connectors");
  const [isPending, startTransition] = useTransition();

  if (!connected) {
    return (
      <Button
        variant="outline"
        size="sm"
        render={<a href={`/api/instagram/connect?clientServiceId=${clientServiceId}`} />}
        nativeButton={false}
      >
        <Camera aria-hidden="true" data-icon="inline-start" />
        {t("instagram.connect")}
      </Button>
    );
  }

  function handleDisconnect() {
    startTransition(async () => {
      try {
        unwrap(await disconnectInstagram(clientServiceId));
        toast.success(t("instagram.disconnected"));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-foreground">
        <Camera className="size-4 text-primary" aria-hidden="true" />
        {username ? t("instagram.statusWithName", { username }) : t("instagram.status")}
      </span>
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
