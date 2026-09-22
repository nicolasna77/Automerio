"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  ROLE_DESCRIPTIONS,
  roleLabel,
} from "@/lib/organization-roles";
import { inviteMemberAction } from "./actions";

export function InviteForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("member");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        unwrap(await inviteMemberAction(organizationId, email, role));
        toast.success(`Invitation envoyée à ${email.trim()}.`);
        setEmail("");
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, "L'invitation n'a pas pu être envoyée."));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="invite-email">Adresse e-mail</Label>
          <Input
            id="invite-email"
            type="email"
            required
            autoComplete="off"
            placeholder="sophie@exemple.fr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-role">Rôle</Label>
          <Select
            value={role}
            onValueChange={(value) => value && setRole(value)}
            disabled={pending}
          >
            <SelectTrigger id="invite-role" className="w-full sm:w-44">
              <SelectValue>{(value) => roleLabel(String(value))}</SelectValue>
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
          {pending ? "Envoi…" : "Inviter"}
        </Button>
      </div>
      <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
        {ROLE_DESCRIPTIONS[role]} La personne recevra un lien pour rejoindre
        l&apos;entreprise ; si elle n&apos;a pas de compte Automerio, elle pourra
        en créer un.
      </p>
    </form>
  );
}
