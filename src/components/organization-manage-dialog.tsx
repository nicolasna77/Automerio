"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { deleteOrganizationAction } from "@/app/[locale]/dashboard/organization-actions";
import type { OrganizationSummary } from "@/lib/organization";

export function OrganizationManageDialog({
  organization,
  canDelete,
  open,
  onOpenChange,
}: {
  organization: OrganizationSummary;
  canDelete: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const t = useTranslations("Workspace.organization");
  const tCommon = useTranslations("Common");
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!trimmedName || trimmedName === organization.name) return;

    setIsRenaming(true);
    const { error } = await authClient.organization.update({
      organizationId: organization.id,
      data: { name: trimmedName },
    });
    setIsRenaming(false);

    if (error) {
      toast.error(error.message ?? t("renameError"));
      return;
    }

    toast.success(t("renamed"));
    router.refresh();
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      unwrap(await deleteOrganizationAction(organization.id));
      toast.success(t("deleted", { name: organization.name }));
      setConfirmDelete(false);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, t("deleteError")));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("manageTitle")}</DialogTitle>
            <DialogDescription>{t("manageDescription", { name: organization.name })}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRename} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization-name">{t("renameLabel")}</Label>
              <div className="flex gap-2">
                <Input
                  key={open ? organization.id : "closed"}
                  id="organization-name"
                  name="name"
                  defaultValue={organization.name}
                  required
                />
                <Button type="submit" variant="outline" disabled={isRenaming}>
                  {isRenaming ? tCommon("renaming") : tCommon("rename")}
                </Button>
              </div>
            </div>
          </form>

          <DialogFooter className="border-t border-border pt-4">
            <Button
              type="button"
              variant="destructive"
              disabled={!canDelete}
              onClick={() => setConfirmDelete(true)}
            >
              {t("deleteAction")}
            </Button>
          </DialogFooter>
          {!canDelete && (
            <p className="-mt-4 text-xs text-muted-foreground">
              {t("keepOne")}
            </p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle", { name: organization.name })}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-busy={isDeleting}
            >
              {isDeleting ? tCommon("deleting") : tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
