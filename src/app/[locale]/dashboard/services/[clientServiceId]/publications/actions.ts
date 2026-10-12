"use server";

import { revalidatePath } from "next/cache";
import type { InstagramDraftKind } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { canReadClientService, viewerOf } from "@/lib/client-service-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { actionError, runAction } from "@/lib/run-action";
import { generateInstagramDraft } from "@/lib/instagram-drafts/agent";
import {
  canDraftInstagram,
  DETAILS_MAX,
  DRAFTS_KEPT,
  DRAFTS_PER_DAY,
  isDraftGoal,
  isDraftKind,
  needsGoal,
  SUBJECT_MAX,
  unsupportedNumbers,
} from "@/lib/instagram-drafts/content";

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const publicationsPath = (clientServiceId: string) => `/dashboard/services/${clientServiceId}/publications`;

// Rédige un brouillon Instagram (légende, carrousel, hashtags ou planning) et
// le range en tête de l'historique. Tout membre de l'organisation y a droit,
// une fois la solution Instagram payée ; rien n'est publié.
export async function createInstagramDraft(
  clientServiceId: string,
  input: { kind: InstagramDraftKind; subject: string; goal?: string | null; details?: string | null }
) {
  return runAction(async () => {
    const session = await getSession();
    if (!session) throw actionError("sessionExpired");

    const clientService = await db.clientService.findUnique({
      where: { id: clientServiceId },
      select: {
        organizationId: true,
        status: true,
        configuration: true,
        organization: { select: { name: true } },
        service: { select: { slug: true } },
      },
    });
    if (!clientService || !canReadClientService(clientService, await viewerOf(session.user.id))) {
      throw actionError("notYourService");
    }
    if (!canDraftInstagram(clientService)) throw actionError("instagramDraftsUnavailable");

    if (!isDraftKind(input.kind)) throw actionError("generic");
    const subject = asText(input.subject)?.slice(0, SUBJECT_MAX);
    if (!subject) throw actionError("instagramDraftSubjectRequired");
    const goal = needsGoal(input.kind) && isDraftGoal(input.goal) ? input.goal : null;
    const details = asText(input.details)?.slice(0, DETAILS_MAX) ?? null;

    if (!process.env.OPENAI_API_KEY) throw actionError("instagramDraftsUnavailable");
    if (!(await checkRateLimit("instagram-drafts", clientServiceId, "24 h", DRAFTS_PER_DAY))) {
      throw actionError("tooManyInstagramDrafts", { count: DRAFTS_PER_DAY });
    }

    const configuration = (clientService.configuration ?? {}) as Record<string, unknown>;
    const business = {
      name: clientService.organization.name,
      instagramUsername: asText(configuration.instagramUsername),
      faq: asText(configuration.faq),
    };
    const draft = await generateInstagramDraft({ kind: input.kind, subject, goal, details, business });
    const warnings = unsupportedNumbers(draft, [subject, details ?? "", business.name, business.faq ?? ""]);

    const created = await db.instagramDraft.create({
      data: {
        clientServiceId,
        createdById: session.user.id,
        kind: input.kind,
        subject,
        goal,
        details,
        content: draft.content,
        warnings,
      },
      select: { id: true },
    });

    // L'historique garde les 20 derniers brouillons de la solution.
    const older = await db.instagramDraft.findMany({
      where: { clientServiceId },
      orderBy: { createdAt: "desc" },
      skip: DRAFTS_KEPT,
      select: { id: true },
    });
    if (older.length > 0) {
      await db.instagramDraft.deleteMany({ where: { id: { in: older.map((d) => d.id) } } });
    }

    revalidatePath(publicationsPath(clientServiceId));
    return { id: created.id };
  });
}

export async function deleteInstagramDraft(draftId: string) {
  return runAction(async () => {
    const session = await getSession();
    if (!session) throw actionError("sessionExpired");

    const draft = await db.instagramDraft.findUnique({
      where: { id: draftId },
      select: { clientServiceId: true, clientService: { select: { organizationId: true } } },
    });
    if (!draft || !canReadClientService(draft.clientService, await viewerOf(session.user.id))) {
      throw actionError("notYourService");
    }

    await db.instagramDraft.delete({ where: { id: draftId } });
    revalidatePath(publicationsPath(draft.clientServiceId));
  });
}
