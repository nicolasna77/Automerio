import type { AuditAction } from "@prisma/client";
import { db } from "@/lib/db";

export async function logAdminAction(input: {
  actor: { id: string; name: string; email: string };
  action: AuditAction;
  target: { type: "user" | "service" | "promo_code"; id: string; label: string };
  detail?: string | null;
}) {
  await db.auditLog.create({
    data: {
      actorId: input.actor.id,
      actorLabel: `${input.actor.name} (${input.actor.email})`,
      action: input.action,
      targetType: input.target.type,
      targetId: input.target.id,
      targetLabel: input.target.label,
      detail: input.detail?.trim() || null,
    },
  });
}

export const SENSITIVE_AUDIT_ACTIONS = new Set<AuditAction>([
  "USER_ROLE_CHANGED",
  "USER_BANNED",
  "USER_PASSWORD_RESET",
  "USER_SESSION_REVOKED",
]);
