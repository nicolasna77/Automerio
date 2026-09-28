"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parsePreferences } from "@/lib/email/preferences";
import type { NotificationType } from "@/lib/email/types";

export async function setNotificationPreference(
  type: NotificationType,
  enabled: boolean
) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { notificationPreferences: true },
  });
  const next = parsePreferences(user.notificationPreferences);
  if (enabled) delete next[type];
  else next[type] = false;

  await db.user.update({
    where: { id: session.user.id },
    data: { notificationPreferences: next },
  });

  revalidatePath("/dashboard/profile");
}
