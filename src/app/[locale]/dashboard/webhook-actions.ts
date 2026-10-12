"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canManageClientServiceBilling, canReadClientService, viewerOf } from "@/lib/client-service-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { actionError, runAction } from "@/lib/run-action";
import { checkWebhookUrl, generateWebhookSecret, postWebhook } from "@/lib/outgoing-webhook";

// Webhook sortant d'une solution (onglet « Intégrations » des réglages) :
// réservé aux responsables, comme les autres connexions.
async function requireManagedService(clientServiceId: string) {
  const session = await requireUser();
  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    select: { id: true, organizationId: true, webhookUrl: true, webhookSecret: true },
  });
  const viewer = await viewerOf(session.user.id);
  if (!clientService || !canReadClientService(clientService, viewer)) throw actionError("notYourService");
  if (!canManageClientServiceBilling(clientService, viewer)) throw actionError("managersOnly");
  return { userId: session.user.id, clientService };
}

function revalidateSettings(clientServiceId: string) {
  revalidatePath(`/dashboard/services/${clientServiceId}/configuration`);
}

export async function saveWebhookAction(clientServiceId: string, url: string) {
  return runAction(async () => {
    const { userId, clientService } = await requireManagedService(clientServiceId);
    if (!(await checkRateLimit("webhook-save", userId, "10 m", 10))) throw actionError("tooManyAttempts");

    const check = await checkWebhookUrl(url);
    if (!check.ok) {
      throw actionError(
        check.reason === "https" ? "webhookNotHttps" : check.reason === "private" ? "webhookPrivate" : "webhookInvalid"
      );
    }
    // Le secret est gardé quand seule l'adresse change : l'outil du client
    // continue de vérifier les signatures sans réglage de plus.
    await db.clientService.update({
      where: { id: clientServiceId },
      data: { webhookUrl: check.url, webhookSecret: clientService.webhookSecret ?? generateWebhookSecret() },
    });
    revalidateSettings(clientServiceId);
  });
}

export async function removeWebhookAction(clientServiceId: string) {
  return runAction(async () => {
    await requireManagedService(clientServiceId);
    await db.clientService.update({
      where: { id: clientServiceId },
      data: { webhookUrl: null, webhookSecret: null },
    });
    revalidateSettings(clientServiceId);
  });
}

export async function sendTestWebhookAction(clientServiceId: string) {
  return runAction(async () => {
    const { userId, clientService } = await requireManagedService(clientServiceId);
    if (!(await checkRateLimit("webhook-test", userId, "10 m", 10))) throw actionError("tooManyAttempts");
    if (!clientService.webhookUrl || !clientService.webhookSecret) throw actionError("webhookMissing");

    const result = await postWebhook({
      url: clientService.webhookUrl,
      secret: clientService.webhookSecret,
      event: "test",
      clientServiceId,
      data: { message: "Test" },
    });
    if (!result.ok) {
      throw result.status === null
        ? actionError("webhookUnreachable")
        : actionError("webhookRejected", { status: result.status });
    }
    return { status: result.status };
  });
}
