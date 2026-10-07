"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { revokeUserSessionAction } from "./actions";

export function RevokeSessionButton({
  userId,
  sessionToken,
  expired = false,
}: {
  userId: string;
  sessionToken: string;
  expired?: boolean;
}) {
  const t = useTranslations("Admin.users.revoke");
  const [isPending, startTransition] = useTransition();

  if (expired) {
    return (
      <span className="text-xs text-muted-foreground">{t("alreadyExpired")}</span>
    );
  }

  function handleRevoke() {
    startTransition(async () => {
      try {
        unwrap(await revokeUserSessionAction(userId, sessionToken));
        toast.success(t("revoked"));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={handleRevoke}
      loading={isPending}
    >
      {!isPending && t("revoke")}
    </Button>
  );
}
