"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (addressedToAnotherAccount) {
    return (
      <p className="text-sm text-muted-foreground">
        Cette invitation a été envoyée à {invitedEmail}, et vous êtes connecté
        avec une autre adresse. Déconnectez-vous, puis reprenez ce lien depuis le
        compte invité.
      </p>
    );
  }

  function handleAccept() {
    startTransition(async () => {
      try {
        unwrap(await acceptInvitationAction(invitationId));
        toast.success(`Vous avez rejoint ${organizationName}.`);
        router.push("/dashboard");
      } catch (err) {
        toast.error(getErrorMessage(err, "L'invitation n'a pas pu être acceptée."));
      }
    });
  }

  return (
    <Button onClick={handleAccept} disabled={pending}>
      {pending ? "En cours…" : `Rejoindre ${organizationName}`}
    </Button>
  );
}
