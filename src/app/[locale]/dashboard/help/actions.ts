"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import {
  sendHelpRequestClientReplyInternalEmail,
  sendNewHelpRequestInternalEmail,
} from "@/lib/email/notifications";
import { actionError, runAction } from "@/lib/run-action";

async function requireSession() {
  const session = await getSession();
  if (!session) throw actionError("sessionExpired");
  return session;
}

export async function submitHelpRequest(input: {
  subject: string;
  message: string;
  clientServiceId: string | null;
}) {
  return runAction(async () => {
    const session = await requireSession();
    const { active } = await requireActiveOrganization();

    const subject = input.subject.trim();
    const message = input.message.trim();
    if (!subject || !message) {
      throw actionError("helpFieldsRequired");
    }

    let clientService: { organizationId: string; name: string } | null = null;
    if (input.clientServiceId) {
      clientService = await db.clientService.findUnique({
        where: { id: input.clientServiceId },
        select: { organizationId: true, name: true },
      });
      if (!clientService || clientService.organizationId !== active.id) {
        throw actionError("serviceNotFound");
      }
    }

    await db.helpRequest.create({
      data: {
        userId: session.user.id,
        organizationId: active.id,
        clientServiceId: input.clientServiceId,
        subject,
        message,
      },
    });
    await sendNewHelpRequestInternalEmail({
      clientName: session.user.name,
      clientEmail: session.user.email,
      organizationName: active.name,
      subject,
      message,
      serviceName: clientService?.name ?? null,
    });

    revalidatePath("/dashboard/help");
    revalidatePath("/admin/help");
  });
}

export async function replyToHelpRequest(helpRequestId: string, body: string) {
  return runAction(async () => {
    const session = await requireSession();
    const { active } = await requireActiveOrganization();

    const trimmed = body.trim();
    if (!trimmed) throw actionError("emptyMessage");

    const helpRequest = await db.helpRequest.findUnique({
      where: { id: helpRequestId },
      select: { id: true, subject: true, status: true, organizationId: true },
    });
    if (!helpRequest || helpRequest.organizationId !== active.id) {
      throw actionError("requestNotFound");
    }

    await db.helpRequestMessage.create({
      data: { helpRequestId, authorId: session.user.id, fromTeam: false, body: trimmed },
    });

    if (helpRequest.status === "RESOLVED") {
      await db.helpRequest.update({
        where: { id: helpRequestId },
        data: { status: "OPEN", resolvedAt: null },
      });
    }

    await sendHelpRequestClientReplyInternalEmail({
      clientName: session.user.name,
      clientEmail: session.user.email,
      organizationName: active.name,
      subject: helpRequest.subject,
      body: trimmed,
    });

    revalidatePath("/dashboard/help");
    revalidatePath("/admin/help");
  });
}
