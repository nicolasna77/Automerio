"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { ActionError, runAction } from "@/lib/run-action";

export async function acceptInvitationAction(invitationId: string) {
  return runAction(async () => {
    // La session suffit : better-auth verifie lui-meme que l'invitation vise
    // bien l'adresse du compte connecte, qu'elle est en attente et non expiree.
    await requireUser();

    try {
      await auth.api.acceptInvitation({
        body: { invitationId },
        headers: await headers(),
      });
    } catch (err) {
      console.error("[invitation] acceptation refusée :", err);
      throw new ActionError(
        "Cette invitation n'est plus valable, ou elle ne vous est pas destinée."
      );
    }

    revalidatePath("/dashboard", "layout");
  });
}
