"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

// Change l'organisation active puis recharge les données de la page : la
// barre latérale et la page Organisation passent par le même chemin.
export function useSwitchOrganization(activeId: string) {
  const router = useRouter();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  async function switchTo(organizationId: string) {
    if (organizationId === activeId) return;
    setSwitchingId(organizationId);
    const { error } = await authClient.organization.setActive({ organizationId });
    setSwitchingId(null);

    if (error) {
      console.error("[organisation] changement refusé :", error);
      toast.error("Impossible de changer d'organisation. Rechargez la page puis réessayez.");
      return;
    }
    router.refresh();
  }

  return { switchTo, switchingId };
}
