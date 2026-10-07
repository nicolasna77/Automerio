"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Check } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { setCallHandledAction } from "./call-actions";

export function MarkHandledButton({
  clientServiceId,
  callId,
  label,
}: {
  clientServiceId: string;
  callId: string;
  label: string;
}) {
  const router = useRouter();
  const t = useTranslations("Dashboard.overview.callbacks");
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      aria-label={t("markHandledLabel", { label })}
      onClick={() =>
        startTransition(async () => {
          try {
            unwrap(await setCallHandledAction(clientServiceId, callId, true));
            router.refresh();
          } catch (err) {
            toast.error(getErrorMessage(err, t("updateError")));
          }
        })
      }
    >
      <Check aria-hidden="true" data-icon="inline-start" />
      {t("markHandled")}
    </Button>
  );
}
