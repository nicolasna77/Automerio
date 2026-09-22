"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { roleLabel } from "@/lib/organization-roles";
import { cancelInvitationAction } from "./actions";

export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

export function PendingInvitations({
  organizationId,
  invitations,
  canManage,
}: {
  organizationId: string;
  canManage: boolean;
  invitations: PendingInvitation[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleCancel(invitation: PendingInvitation) {
    startTransition(async () => {
      try {
        unwrap(await cancelInvitationAction(organizationId, invitation.id));
        toast.success(`Invitation de ${invitation.email} annulée.`);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, "L'annulation a échoué."));
      }
    });
  }

  return (
    <ul className="divide-y divide-border">
      {invitations.map((invitation) => (
        <li
          key={invitation.id}
          className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{invitation.email}</p>
            <p className="text-xs text-muted-foreground">
              expire le {invitation.expiresAt}
            </p>
          </div>
          <Badge variant="secondary">{roleLabel(invitation.role)}</Badge>
          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => handleCancel(invitation)}
            >
              Annuler
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
