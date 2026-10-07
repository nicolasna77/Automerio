"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { ActionError, runAction } from "@/lib/run-action";

export async function acceptInvitationAction(invitationId: string) {
  return runAction(async () => {
    await requireUser();

    try {
      await auth.api.acceptInvitation({
        body: { invitationId },
        headers: await headers(),
      });
    } catch (err) {
      console.error("[invitation] acceptation refusée :", err);
      const t = await getTranslations("Invitation");
      throw new ActionError(t("invalid"));
    }

    revalidatePath("/dashboard", "layout");
  });
}
