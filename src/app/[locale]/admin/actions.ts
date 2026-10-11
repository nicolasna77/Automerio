"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logServiceEvent } from "@/lib/service-events";
import {
  sendServiceActivatedEmail,
  sendServiceNoteAddedEmail,
} from "@/lib/email/notifications";
import { isUniqueViolation } from "@/lib/meta-connection";
import { actionError, runAction } from "@/lib/run-action";

export async function markServiceActive(clientServiceId: string) {
  return runAction(async () => {
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
  });
}

export async function updateServiceNote(clientServiceId: string, note: string) {
  return runAction(async () => {
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
  });
}

export async function setExternalPhoneNumber(
  clientServiceId: string,
  phoneNumber: string
) {
  return runAction(async () => {
    await requireAdmin();

    const trimmed = phoneNumber.trim();
    await db.clientService.update({
      where: { id: clientServiceId },
      data: { externalPhoneNumber: trimmed || null },
    });
    if (trimmed) await logServiceEvent(clientServiceId, "PHONE_ASSIGNED", trimmed);

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  });
}

export async function setWhatsAppPhoneNumberId(
  clientServiceId: string,
  phoneNumberId: string
) {
  return runAction(async () => {
    await requireAdmin();

    const trimmed = phoneNumberId.trim();
    // Identifiant unique : déjà relié à une autre solution.
    await db.clientService
      .update({
        where: { id: clientServiceId },
        data: { whatsappPhoneNumberId: trimmed || null },
      })
      .catch((err) => {
        throw isUniqueViolation(err) ? actionError("whatsappNumberInUse") : err;
      });
    if (trimmed) {
      const t = await getTranslations("Admin.clientService.events");
      await logServiceEvent(clientServiceId, "CONFIGURATION_UPDATED", t("whatsappConnected"));
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  });
}

export async function setFacebookPageId(clientServiceId: string, pageId: string) {
  return runAction(async () => {
    await requireAdmin();

    const trimmed = pageId.trim();
    // Identifiant unique : déjà relié à une autre solution.
    await db.clientService
      .update({
        where: { id: clientServiceId },
        data: { facebookPageId: trimmed || null },
      })
      .catch((err) => {
        throw isUniqueViolation(err) ? actionError("facebookPageInUse") : err;
      });
    if (trimmed) {
      const t = await getTranslations("Admin.clientService.events");
      await logServiceEvent(clientServiceId, "CONFIGURATION_UPDATED", t("facebookConnected"));
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  });
}

export async function setInstagramAccountId(clientServiceId: string, accountId: string) {
  return runAction(async () => {
    await requireAdmin();

    const trimmed = accountId.trim();
    await db.clientService.update({
      where: { id: clientServiceId },
      data: { instagramAccountId: trimmed || null },
    });
    if (trimmed) {
      const t = await getTranslations("Admin.clientService.events");
      await logServiceEvent(clientServiceId, "CONFIGURATION_UPDATED", t("instagramConnected"));
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  });
}
