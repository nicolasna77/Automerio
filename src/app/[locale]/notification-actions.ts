"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function markNotificationsSeen() {
  const session = await getSession();
  if (!session) return;

  await db.user.update({
    where: { id: session.user.id },
    data: { notificationsSeenAt: new Date() },
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
}
