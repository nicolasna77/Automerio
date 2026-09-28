"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { assertCanReadClientService } from "@/lib/client-service-access";
import { ActionError, runAction } from "@/lib/run-action";

export async function setCallHandledAction(clientServiceId: string, callId: string, handled: boolean) {
  return runAction(async () => {
    const session = await requireUser();
    if (!(await assertCanReadClientService(clientServiceId, session.user.id))) {
      throw new ActionError("Cette solution n'appartient pas à votre organisation.");
    }

    const { count } = await db.usageEvent.updateMany({
      where: { id: callId, clientServiceId, type: "call" },
      data: { handledAt: handled ? new Date() : null },
    });
    if (count === 0) throw new ActionError("Cet appel est introuvable.");

    revalidatePath("/dashboard", "layout");
  });
}
