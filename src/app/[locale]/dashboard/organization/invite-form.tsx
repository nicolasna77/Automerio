"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import {
  INVITABLE_ROLES,
  INVITABLE_ROLE_ITEMS,
  ROLE_DESCRIPTIONS,
  roleLabel,
} from "@/lib/organization-roles";
import { inviteMemberAction } from "./actions";

export function InviteForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const t = useTranslations("Dashboard.organization.inviteForm");
  const tCommon = useTranslations("Common");
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("member");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        unwrap(await inviteMemberAction(organizationId, email, role));
        toast.success(t("sent", { email: email.trim() }));
        setEmail("");
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t("failed")));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="invite-email">{t("email")}</Label>
          <Input
            id="invite-email"
            type="email"
            required
            autoComplete="off"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-role">{t("role")}</Label>
          <Select
            value={role}
            items={INVITABLE_ROLE_ITEMS}
            onValueChange={(value) => value && setRole(value)}
            disabled={pending}
          >
            <SelectTrigger id="invite-role" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVITABLE_ROLES.map((value) => (
                <SelectItem key={value} value={value}>
                  {roleLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={pending || email.trim() === ""}>
          {pending ? tCommon("sending") : t("submit")}
        </Button>
      </div>
      <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
        {t("help", { roleDescription: ROLE_DESCRIPTIONS[role] ?? "" })}
      </p>
    </form>
  );
}
