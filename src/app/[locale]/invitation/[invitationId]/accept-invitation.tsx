"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { acceptInvitationAction } from "./actions";

export function AcceptInvitation({
  invitationId,
  organizationName,
  addressedToAnotherAccount,
  invitedEmail,
}: {
  invitationId: string;
  organizationName: string;
  addressedToAnotherAccount: boolean;
  invitedEmail: string;
}) {
  const t = useTranslations("Invitation");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (addressedToAnotherAccount) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("otherAccount", { email: invitedEmail })}
      </p>
    );
  }

  function handleAccept() {
    startTransition(async () => {
      try {
        unwrap(await acceptInvitationAction(invitationId));
        toast.success(t("joined", { organization: organizationName }));
        router.push("/dashboard");
      } catch (err) {
        toast.error(getErrorMessage(err, t("acceptFailed")));
      }
    });
  }

  return (
    <Button onClick={handleAccept} disabled={pending}>
      {pending ? t("joining") : t("join", { organization: organizationName })}
    </Button>
  );
}
