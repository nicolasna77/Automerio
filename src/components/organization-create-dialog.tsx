"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { slugify } from "@/lib/utils";

export function OrganizationCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open) setName("");
    onOpenChange(open);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSubmitting(true);
    const { data, error } = await authClient.organization.create({
      name: trimmedName,
      slug: slugify(trimmedName),
    });
    if (data) await authClient.organization.setActive({ organizationId: data.id });
    setIsSubmitting(false);

    if (error) {
      console.error("[organisation] création refusée :", error);
      toast.error("Impossible de créer l'organisation. Rechargez la page puis réessayez.");
      return;
    }

    toast.success(`« ${trimmedName} » a été créée.`);
    handleOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Créer une organisation
          </DialogTitle>
          <DialogDescription>
            Une organisation regroupe les solutions d&apos;une même
            entreprise.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-organization-name">Nom de l&apos;organisation</Label>
            <Input
              id="new-organization-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dupont Coiffure"
              autoFocus
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
