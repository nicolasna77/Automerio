"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import type { HelpRequestStatus } from "@prisma/client";
import {
  sendHelpRequestReplyEmail,
  sendHelpRequestResolvedEmail,
} from "@/lib/email/notifications";
import { actionError, runAction } from "@/lib/run-action";

export async function setHelpRequestStatus(
  helpRequestId: string,
  status: HelpRequestStatus
) {
  return runAction(async () => {
    await requireAdmin();

    const updated = await db.helpRequest.update({
      where: { id: helpRequestId },
      data: { status, resolvedAt: status === "RESOLVED" ? new Date() : null },
      include: { user: true },
    });

    if (status === "RESOLVED") {
      await sendHelpRequestResolvedEmail(
        {
          email: updated.user.email,
          name: updated.user.name,
          notificationPreferences: updated.user.notificationPreferences,
        },
        updated.subject
      );
    }

    revalidatePath("/admin/help");
    revalidatePath("/dashboard/help");
  });
}

export async function replyToHelpRequest(helpRequestId: string, body: string) {
  return runAction(async () => {
    const session = await requireAdmin();

    const trimmed = body.trim();
    if (!trimmed) throw actionError("emptyMessage");

    const helpRequest = await db.helpRequest.findUniqueOrThrow({
      where: { id: helpRequestId },
      include: { user: true },
    });

    await db.helpRequestMessage.create({
      data: { helpRequestId, authorId: session.user.id, fromTeam: true, body: trimmed },
    });

    await sendHelpRequestReplyEmail(
      {
        email: helpRequest.user.email,
        name: helpRequest.user.name,
        notificationPreferences: helpRequest.user.notificationPreferences,
      },
      helpRequest.subject,
      trimmed
    );

    revalidatePath("/admin/help");
    revalidatePath("/dashboard/help");
  });
}

export async function bulkResolveHelpRequests(formData: FormData) {
  await requireAdmin();

  const ids = formData.getAll("helpRequestIds").filter((v): v is string => typeof v === "string");
  if (ids.length === 0) return;

  const toResolve = await db.helpRequest.findMany({
    where: { id: { in: ids }, status: "OPEN" },
    include: { user: true },
  });
  if (toResolve.length === 0) return;

  await db.helpRequest.updateMany({
    where: { id: { in: toResolve.map((r) => r.id) } },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  await Promise.allSettled(
    toResolve.map((r) =>
      sendHelpRequestResolvedEmail(
        {
          email: r.user.email,
          name: r.user.name,
          notificationPreferences: r.user.notificationPreferences,
        },
        r.subject
      )
    )
  );

  revalidatePath("/admin/help");
  revalidatePath("/dashboard/help");
}
