"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logAdminAction } from "@/lib/audit";
import { ActionError, runAction } from "@/lib/run-action";

async function requireAdminActingOnOther(userId: string, message: string) {
  const session = await requireAdmin();
  if (userId === session.user.id) throw new ActionError(message);
  return session;
}

function revalidateUserPaths(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

async function targetUserLabel(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  return user ? `${user.name} (${user.email})` : userId;
}

export async function setUserRoleAction(
  userId: string,
  role: "ADMIN" | "CLIENT"
) {
  return runAction(async () => {
    const session = await requireAdminActingOnOther(
      userId,
      "Vous ne pouvez pas modifier votre propre rôle."
    );
    const label = await targetUserLabel(userId);

    await auth.api.setRole({
      body: { userId, role },
      headers: await headers(),
    });

    await logAdminAction({
      actor: session.user,
      action: "USER_ROLE_CHANGED",
      target: { type: "user", id: userId, label },
      detail: `Nouveau rôle : ${role}`,
    });

    revalidateUserPaths(userId);
  });
}

export async function banUserAction(userId: string, banReason: string) {
  return runAction(async () => {
    const session = await requireAdminActingOnOther(
      userId,
      "Vous ne pouvez pas vous bannir vous-même."
    );
    const label = await targetUserLabel(userId);
    const reason = banReason.trim();

    await auth.api.banUser({
      body: { userId, banReason: reason || undefined },
      headers: await headers(),
    });

    await logAdminAction({
      actor: session.user,
      action: "USER_BANNED",
      target: { type: "user", id: userId, label },
      detail: reason ? `Motif : ${reason}` : "Sans motif renseigné",
    });

    revalidateUserPaths(userId);
  });
}

export async function unbanUserAction(userId: string) {
  return runAction(async () => {
    const session = await requireAdmin();
    const label = await targetUserLabel(userId);

    await auth.api.unbanUser({
      body: { userId },
      headers: await headers(),
    });

    await logAdminAction({
      actor: session.user,
      action: "USER_UNBANNED",
      target: { type: "user", id: userId, label },
    });

    revalidateUserPaths(userId);
  });
}

export async function setUserPasswordAction(userId: string, newPassword: string) {
  return runAction(async () => {
    const session = await requireAdminActingOnOther(
      userId,
      "Vous ne pouvez pas réinitialiser votre propre mot de passe ici."
    );
    if (newPassword.length < 8) {
      throw new ActionError("Le mot de passe doit contenir au moins 8 caractères.");
    }
    const label = await targetUserLabel(userId);

    await auth.api.setUserPassword({
      body: { userId, newPassword },
      headers: await headers(),
    });

    await auth.api.revokeUserSessions({
      body: { userId },
      headers: await headers(),
    });

    await logAdminAction({
      actor: session.user,
      action: "USER_PASSWORD_RESET",
      target: { type: "user", id: userId, label },
      detail: "Sessions existantes révoquées",
    });
  });
}

export async function revokeUserSessionAction(
  userId: string,
  sessionToken: string
) {
  return runAction(async () => {
    const session = await requireAdmin();
    const label = await targetUserLabel(userId);

    await auth.api.revokeUserSession({
      body: { sessionToken },
      headers: await headers(),
    });

    await logAdminAction({
      actor: session.user,
      action: "USER_SESSION_REVOKED",
      target: { type: "user", id: userId, label },
    });

    revalidatePath(`/admin/users/${userId}`);
  });
}
