"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { INVITABLE_ROLES, roleLabel } from "@/lib/organization-roles";
import { changeMemberRoleAction, removeMemberAction } from "./actions";

export type TeamMemberRow = {
  id: string;
  role: string;
  name: string;
  email: string;
  joinedAt: string;
  isMe: boolean;
};

export function TeamMembers({
  organizationId,
  members,
  canManage,
}: {
  organizationId: string;
  currentUserId: string;
  canManage: boolean;
  members: TeamMemberRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toRemove, setToRemove] = useState<TeamMemberRow | null>(null);

  function run(work: () => Promise<void>) {
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, "L'opération a échoué."));
      }
    });
  }

  function handleRoleChange(member: TeamMemberRow, role: string) {
    if (role === member.role) return;
    run(async () => {
      unwrap(await changeMemberRoleAction(organizationId, member.id, role));
      toast.success(`${member.name} est maintenant ${roleLabel(role).toLowerCase()}.`);
    });
  }

  function handleRemove(member: TeamMemberRow) {
    run(async () => {
      unwrap(await removeMemberAction(organizationId, member.id));
      toast.success(`${member.name} n'a plus accès à cette entreprise.`);
      setToRemove(null);
    });
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {members.map((member) => {
          // Le propriétaire ne se modifie pas depuis cette page : son rôle se
          // transmet, ce qui est un autre geste.
          const isOwner = member.role.split(",").includes("owner");
          const editable = canManage && !isOwner;

          return (
            <li
              key={member.id}
              className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {member.name}
                  {member.isMe && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      vous
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.email} · depuis le {member.joinedAt}
                </p>
              </div>

              {editable ? (
                <Select
                  value={member.role}
                  onValueChange={(role) => role && handleRoleChange(member, role)}
                  disabled={pending}
                >
                  <SelectTrigger className="w-40" aria-label={`Rôle de ${member.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary">{roleLabel(member.role)}</Badge>
              )}

              {editable && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => setToRemove(member)}
                >
                  Retirer
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer {toRemove?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette personne perdra l&apos;accès aux solutions de cette
              entreprise, à leurs journaux d&apos;appels et à leur configuration.
              Vous pourrez l&apos;inviter à nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => toRemove && handleRemove(toRemove)}
            >
              {pending ? "Retrait…" : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
