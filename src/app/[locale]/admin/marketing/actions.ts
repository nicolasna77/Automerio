"use server";

import { revalidatePath } from "next/cache";
import type { MarketingChannel } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getCatalog } from "@/lib/get-catalog";
import { generateMarketingPosts } from "@/lib/marketing/agent";
import { exceedsChannelLimit } from "@/lib/marketing/channels";
import { detectUnsupportedClaims } from "@/lib/marketing/claims";
import { ActionError, runAction } from "@/lib/run-action";

const RECENT_ANGLES_WINDOW = 30;

export async function generatePostsAction(channel: MarketingChannel, count: number) {
  await requireAdmin();

  const [services, recent] = await Promise.all([
    getCatalog(),
    db.marketingPost.findMany({
      where: { channel },
      orderBy: { createdAt: "desc" },
      take: RECENT_ANGLES_WINDOW,
      select: { angle: true },
    }),
  ]);

  const proposals = await generateMarketingPosts({
    channel,
    services,
    recentAngles: recent.map((p) => p.angle),
    count: Math.min(Math.max(count, 1), 5),
  });

  const slugToId = new Map(services.map((s) => [s.slug, s.id]));

  await db.marketingPost.createMany({
    data: proposals.map((proposal) => ({
      channel,
      angle: proposal.angle,
      body: proposal.body,
      imageBrief: proposal.imageBrief,
      warnings: proposal.warnings,
      serviceId: proposal.serviceSlug ? (slugToId.get(proposal.serviceSlug) ?? null) : null,
    })),
  });

  revalidatePath("/admin/marketing");
}

export async function updatePostAction(id: string, body: string) {
  return runAction(async () => {
    await requireAdmin();

    const post = await db.marketingPost.findUnique({ where: { id }, select: { channel: true } });
    if (!post) throw new ActionError("Publication introuvable.");
    if (exceedsChannelLimit(post.channel, body)) {
      throw new ActionError("Le texte dépasse la limite de ce réseau.");
    }

    await db.marketingPost.update({
      where: { id },
      data: { body, warnings: detectUnsupportedClaims(body) },
    });
    revalidatePath("/admin/marketing");
  });
}

export async function approvePostAction(id: string, scheduledFor: Date | null) {
  await requireAdmin();
  await db.marketingPost.update({
    where: { id },
    data: { status: "APPROVED", scheduledFor },
  });
  revalidatePath("/admin/marketing");
}

export async function rejectPostAction(id: string) {
  await requireAdmin();
  await db.marketingPost.update({ where: { id }, data: { status: "REJECTED" } });
  revalidatePath("/admin/marketing");
}

export async function reopenPostAction(id: string) {
  await requireAdmin();
  await db.marketingPost.update({
    where: { id },
    data: { status: "DRAFT", scheduledFor: null },
  });
  revalidatePath("/admin/marketing");
}

export async function markPublishedAction(id: string) {
  await requireAdmin();
  await db.marketingPost.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  revalidatePath("/admin/marketing");
}
