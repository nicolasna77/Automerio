"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { initialsOf } from "@/lib/initials";
import { getErrorMessage } from "@/lib/utils";
import {
  INVITABLE_ROLES,
  INVITABLE_ROLE_ITEMS,
  ROLE_DESCRIPTIONS,
  roleLabel,
} from "@/lib/organization-roles";
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
          // Le propriétaire ne se modifie pas ici : son rôle se transmet, ce qui
          // est un autre geste.
          const isOwner = member.role.split(",").includes("owner");
          const editable = canManage && !isOwner;

          return (
            <li key={member.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="text-xs">
                    {initialsOf(member.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="truncate">{member.name}</span>
                    {member.isMe && (
                      <Badge variant="outline" className="shrink-0 font-normal">
                        vous
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ROLE_DESCRIPTIONS[member.role] ??
                      `Membre depuis le ${member.joinedAt}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  {editable ? (
                    <Select
                      value={member.role}
                      items={INVITABLE_ROLE_ITEMS}
                      onValueChange={(role) => role && handleRoleChange(member, role)}
                      disabled={pending}
                    >
                      <SelectTrigger
                        className="w-40"
                        aria-label={`Rôle de ${member.name}`}
                      >
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
                </div>
              </div>
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
