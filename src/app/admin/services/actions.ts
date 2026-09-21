"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logAdminAction } from "@/lib/audit";
import { ActionError, runAction } from "@/lib/run-action";
import type { ServiceCategory } from "@/lib/catalog";
import { usageCapLabelOf, type UsageUnit } from "@/lib/usage-cap";

function formatCents(cents: number | null): string {
  return cents === null
    ? "aucun"
    : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
        cents / 100
      );
}

function describeServiceChanges(
  before: {
    name: string;
    description: string;
    category: ServiceCategory;
    setupFeeCents: number | null;
    monthlyPriceCents: number | null;
    includedUsageUnits: number | null;
    usageUnit: UsageUnit | null;
    overageUnitPriceCents: number | null;
    sortOrder: number;
  },
  after: typeof before
): string {
  const changes: string[] = [];
  if (before.name !== after.name) changes.push(`Nom : ${before.name} → ${after.name}`);
  if (before.category !== after.category) {
    changes.push(`Catégorie : ${before.category} → ${after.category}`);
  }
  if (before.setupFeeCents !== after.setupFeeCents) {
    changes.push(
      `Mise en place : ${formatCents(before.setupFeeCents)} → ${formatCents(after.setupFeeCents)}`
    );
  }
  if (before.monthlyPriceCents !== after.monthlyPriceCents) {
    changes.push(
      `Abonnement : ${formatCents(before.monthlyPriceCents)} → ${formatCents(after.monthlyPriceCents)}`
    );
  }
  const capBefore = usageCapLabelOf(before);
  const capAfter = usageCapLabelOf(after);
  if (capBefore !== capAfter) {
    changes.push(`Plafond d'usage : ${capBefore ?? "aucun"} → ${capAfter ?? "aucun"}`);
  }
  if (before.sortOrder !== after.sortOrder) {
    changes.push(`Ordre : ${before.sortOrder} → ${after.sortOrder}`);
  }
  if (before.description !== after.description) changes.push("Description modifiée");
  return changes.join(" · ");
}

export type ServiceUpdateInput = {
  name: string;
  description: string;
  category: ServiceCategory;
  setupFeeEuros: number | null;
  monthlyPriceEuros: number | null;
  includedUsageUnits: number | null;
  usageUnit: UsageUnit | null;
  overageUnitEuros: number | null;
  sortOrder: number;
};

export async function updateServiceAction(
  serviceId: string,
  input: ServiceUpdateInput
) {
  return runAction(async () => {
    const session = await requireAdmin();

    const name = input.name.trim();
    const description = input.description.trim();
    if (!name) throw new ActionError("Le nom est requis.");
    if (!description) throw new ActionError("La description est requise.");
    if (input.setupFeeEuros === null && input.monthlyPriceEuros === null) {
      throw new ActionError(
        "Au moins un prix (mise en place ou abonnement) est requis."
      );
    }

    // Quantite et unite vont ensemble : l'une sans l'autre ne decrit aucun
    // plafond, et laisserait la jauge du client sans reference.
    const includedUnits = input.includedUsageUnits;
    const hasCap = includedUnits !== null && input.usageUnit !== null;
    if (!hasCap && (includedUnits !== null || input.usageUnit !== null)) {
      throw new ActionError(
        "Un plafond d'usage demande à la fois une quantité incluse et une unité."
      );
    }
    if (hasCap && includedUnits <= 0) {
      throw new ActionError("La quantité incluse doit être supérieure à zéro.");
    }

    const before = await db.service.findUniqueOrThrow({ where: { id: serviceId } });
    const after = await db.service.update({
      where: { id: serviceId },
      data: {
        name,
        description,
        category: input.category,
        setupFeeCents:
          input.setupFeeEuros !== null ? Math.round(input.setupFeeEuros * 100) : null,
        monthlyPriceCents:
          input.monthlyPriceEuros !== null
            ? Math.round(input.monthlyPriceEuros * 100)
            : null,
        includedUsageUnits: hasCap ? includedUnits : null,
        usageUnit: hasCap ? input.usageUnit : null,
        overageUnitPriceCents: hasCap
          ? Math.round((input.overageUnitEuros ?? 0) * 100)
          : null,
        sortOrder: input.sortOrder,
      },
    });

    const changes = describeServiceChanges(before, after);
    if (changes) {
      await logAdminAction({
        actor: session.user,
        action: "SERVICE_UPDATED",
        target: { type: "service", id: serviceId, label: before.name },
        detail: changes,
      });
    }

    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "layout");
  });
}

export async function setServiceActiveAction(serviceId: string, isActive: boolean) {
  return runAction(async () => {
    const session = await requireAdmin();

    const service = await db.service.update({
      where: { id: serviceId },
      data: { isActive },
    });

    await logAdminAction({
      actor: session.user,
      action: isActive ? "SERVICE_ACTIVATED" : "SERVICE_DEACTIVATED",
      target: { type: "service", id: serviceId, label: service.name },
    });

    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "layout");
  });
}
