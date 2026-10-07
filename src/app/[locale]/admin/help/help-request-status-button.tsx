"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import type { HelpRequestStatus } from "@prisma/client";
import { setHelpRequestStatus } from "./actions";

export function HelpRequestStatusButton({
  helpRequestId,
  status,
}: {
  helpRequestId: string;
  status: HelpRequestStatus;
}) {
  const t = useTranslations("Admin.help.status");
  const [isPending, startTransition] = useTransition();
  const nextStatus: HelpRequestStatus =
    status === "OPEN" ? "RESOLVED" : "OPEN";

  function handleClick() {
    startTransition(async () => {
      try {
        unwrap(await setHelpRequestStatus(helpRequestId, nextStatus));
        toast.success(
          nextStatus === "RESOLVED" ? t("resolved") : t("reopened")
        );
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
      onClick={handleClick}
      loading={isPending}
    >
      {status === "OPEN" ? t("markResolved") : t("reopen")}
    </Button>
  );
}
