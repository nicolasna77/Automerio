"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logServiceEvent } from "@/lib/service-events";
import {
  sendServiceActivatedEmail,
  sendServiceNoteAddedEmail,
} from "@/lib/email/notifications";

export async function markServiceActive(clientServiceId: string) {
  await requireAdmin();

  const clientService = await db.clientService.update({
    where: { id: clientServiceId },
    data: { status: "ACTIVE", activatedAt: new Date() },
    include: { user: true },
  });
  await logServiceEvent(clientServiceId, "ACTIVATED");
  await sendServiceActivatedEmail(
    {
      email: clientService.user.email,
      name: clientService.user.name,
      notificationPreferences: clientService.user.notificationPreferences,
    },
    clientService.name,
    clientService.id
  );

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function updateServiceNote(clientServiceId: string, note: string) {
  await requireAdmin();

  const trimmed = note.trim();
  const clientService = await db.clientService.update({
    where: { id: clientServiceId },
    data: { adminNote: trimmed || null },
    include: { user: true },
  });
  if (trimmed) {
    await logServiceEvent(clientServiceId, "NOTE_ADDED", trimmed);
    await sendServiceNoteAddedEmail(
      {
        email: clientService.user.email,
        name: clientService.user.name,
        notificationPreferences: clientService.user.notificationPreferences,
      },
      clientService.name,
      clientService.id,
      trimmed
    );
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function setExternalPhoneNumber(
  clientServiceId: string,
  phoneNumber: string
) {
  await requireAdmin();

  const trimmed = phoneNumber.trim();
  await db.clientService.update({
    where: { id: clientServiceId },
    data: { externalPhoneNumber: trimmed || null },
  });
  if (trimmed) await logServiceEvent(clientServiceId, "PHONE_ASSIGNED", trimmed);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function setWhatsAppPhoneNumberId(
  clientServiceId: string,
  phoneNumberId: string
) {
  await requireAdmin();

  const trimmed = phoneNumberId.trim();
  await db.clientService.update({
    where: { id: clientServiceId },
    data: { whatsappPhoneNumberId: trimmed || null },
  });
  if (trimmed) await logServiceEvent(clientServiceId, "CONFIGURATION_UPDATED", "Numéro WhatsApp connecté");

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function setFacebookPageId(clientServiceId: string, pageId: string) {
  await requireAdmin();

  const trimmed = pageId.trim();
  await db.clientService.update({
    where: { id: clientServiceId },
    data: { facebookPageId: trimmed || null },
  });
  if (trimmed) await logServiceEvent(clientServiceId, "CONFIGURATION_UPDATED", "Page Facebook connectée");

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function setInstagramAccountId(clientServiceId: string, accountId: string) {
  await requireAdmin();

  const trimmed = accountId.trim();
  await db.clientService.update({
    where: { id: clientServiceId },
    data: { instagramAccountId: trimmed || null },
  });
  if (trimmed) await logServiceEvent(clientServiceId, "CONFIGURATION_UPDATED", "Compte Instagram connecté");

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
