"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { setUserRoleAction } from "./actions";

export function RoleSelector({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: "ADMIN" | "CLIENT";
  disabled?: boolean;
}) {
  const t = useTranslations("Admin.users");
  const tCommon = useTranslations("Common");
  const [isPending, startTransition] = useTransition();
  const [pendingRole, setPendingRole] = useState<"ADMIN" | null>(null);

  function applyRole(role: "ADMIN" | "CLIENT") {
    startTransition(async () => {
      try {
        unwrap(await setUserRoleAction(userId, role));
        toast.success(t("roleSelector.updated", { role: t(`role.${role}`) }));
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setPendingRole(null);
      }
    });
  }

  function handleChange(role: string | null) {
    if (role !== "ADMIN" && role !== "CLIENT") return;
    if (role === currentRole) return;
    if (role === "ADMIN") {
      setPendingRole("ADMIN");
      return;
    }
    applyRole(role);
  }

  return (
    <>
      <Select
        value={currentRole}
        items={{ CLIENT: t("role.CLIENT"), ADMIN: t("role.ADMIN") }}
        onValueChange={handleChange}
        disabled={disabled || isPending}
      >
        <SelectTrigger className="w-40" aria-label={t("roleSelector.label")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CLIENT">{t("role.CLIENT")}</SelectItem>
          <SelectItem value="ADMIN">{t("role.ADMIN")}</SelectItem>
        </SelectContent>
      </Select>

      <AlertDialog
        open={pendingRole === "ADMIN"}
        onOpenChange={(open) => !open && setPendingRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("roleSelector.promoteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("roleSelector.promoteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => applyRole("ADMIN")}
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? t("roleSelector.promoting") : t("roleSelector.promote")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
