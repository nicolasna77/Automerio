"use client";

import { useLabels } from "@/hooks/use-labels";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import { INVITABLE_ROLES } from "@/lib/organization-roles";
import { changeMemberRoleAction, removeMemberAction, transferOwnershipAction } from "./actions";

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
  canTransfer = false,
}: {
  organizationId: string;
  canManage: boolean;
  canTransfer?: boolean;
  members: TeamMemberRow[];
}) {
  const router = useRouter();
  const t = useTranslations("Dashboard.organization.members");
  const labels = useLabels();
  const roleItems = Object.fromEntries(INVITABLE_ROLES.map((value) => [value, labels.role(value)]));
  const tCommon = useTranslations("Common");
  const [pending, startTransition] = useTransition();
  const [toRemove, setToRemove] = useState<TeamMemberRow | null>(null);
  const [toPromote, setToPromote] = useState<TeamMemberRow | null>(null);

  function run(work: () => Promise<void>) {
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t("failed")));
      }
    });
  }

  function handleRoleChange(member: TeamMemberRow, role: string) {
    if (role === member.role) return;
    run(async () => {
      unwrap(await changeMemberRoleAction(organizationId, member.id, role));
      toast.success(t("roleChanged", { name: member.name, role: labels.role(role).toLowerCase() }));
    });
  }

  function handleTransfer(member: TeamMemberRow) {
    run(async () => {
      unwrap(await transferOwnershipAction(organizationId, member.id));
      toast.success(t("transferred", { name: member.name }));
      setToPromote(null);
    });
  }

  function handleRemove(member: TeamMemberRow) {
    run(async () => {
      unwrap(await removeMemberAction(organizationId, member.id));
      toast.success(t("removed", { name: member.name }));
      setToRemove(null);
    });
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {members.map((member) => {
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
                        {t("you")}
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {labels.roleDescription(member.role) ?? t("since", { date: member.joinedAt })}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  {editable ? (
                    <Select
                      value={member.role}
                      items={roleItems}
                      onValueChange={(role) => role && handleRoleChange(member, role)}
                      disabled={pending}
                    >
                      <SelectTrigger
                        className="w-40"
                        aria-label={t("roleOf", { name: member.name })}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVITABLE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {labels.role(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{labels.role(member.role)}</Badge>
                  )}

                  {canTransfer && !isOwner && !member.isMe && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => setToPromote(member)}
                    >
                      {t("transfer")}
                    </Button>
                  )}
                  {editable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => setToRemove(member)}
                    >
                      {t("remove")}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={toPromote !== null}
        onOpenChange={(open) => !open && setToPromote(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("transferTitle", { name: toPromote?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("transferBody", { name: toPromote?.name ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => toPromote && handleTransfer(toPromote)}
            >
              {pending ? t("transferring") : t("transferConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeTitle", { name: toRemove?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("removeBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => toRemove && handleRemove(toRemove)}
            >
              {pending ? t("removing") : t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
