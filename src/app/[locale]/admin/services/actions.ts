"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logAdminAction } from "@/lib/audit";
import { actionError, runAction } from "@/lib/run-action";
import { getPriceFormatter } from "@/lib/price-format-server";
import { formatCents, type ServiceCategory } from "@/lib/catalog";
import { readUsageCap, type UsageUnit } from "@/lib/usage-cap";

async function describeServiceChanges(
  before: {
    name: string;
    description: string;
    category: ServiceCategory;
    monthlyPriceCents: number | null;
    includedUsageUnits: number | null;
    usageUnit: UsageUnit | null;
    overageUnitPriceCents: number | null;
    sortOrder: number;
  },
  after: typeof before
): Promise<string> {
  const [t, price] = await Promise.all([
    getTranslations("Admin.services.auditDetail"),
    getPriceFormatter(),
  ]);
  const none = t("none");
  const cents = (value: number | null) => (value === null ? none : formatCents(value));
  const cap = (service: typeof before) => {
    const usageCap = readUsageCap(service);
    return usageCap ? price.usageCap(usageCap) : none;
  };

  const changes: string[] = [];
  if (before.name !== after.name) changes.push(t("name", { before: before.name, after: after.name }));
  if (before.category !== after.category) {
    changes.push(t("category", { before: before.category, after: after.category }));
  }
  if (before.monthlyPriceCents !== after.monthlyPriceCents) {
    changes.push(
      t("subscription", {
        before: cents(before.monthlyPriceCents),
        after: cents(after.monthlyPriceCents),
      })
    );
  }
  const capBefore = cap(before);
  const capAfter = cap(after);
  if (capBefore !== capAfter) changes.push(t("usageCap", { before: capBefore, after: capAfter }));
  if (before.sortOrder !== after.sortOrder) {
    changes.push(t("order", { before: String(before.sortOrder), after: String(after.sortOrder) }));
  }
  if (before.description !== after.description) changes.push(t("description"));
  return changes.join(" · ");
}

export type ServiceUpdateInput = {
  name: string;
  description: string;
  category: ServiceCategory;
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
    if (!name) throw actionError("adminServiceNameRequired");
    if (!description) throw actionError("adminServiceDescriptionRequired");
    if (input.monthlyPriceEuros === null || input.monthlyPriceEuros <= 0) {
      throw actionError("adminServicePriceRequired");
    }

    const includedUnits = input.includedUsageUnits;
    const hasCap = includedUnits !== null && input.usageUnit !== null;
    if (!hasCap && (includedUnits !== null || input.usageUnit !== null)) {
      throw actionError("adminServiceCapIncomplete");
    }
    if (hasCap && includedUnits <= 0) {
      throw actionError("adminServiceCapPositive");
    }

    const before = await db.service.findUniqueOrThrow({ where: { id: serviceId } });
    const after = await db.service.update({
      where: { id: serviceId },
      data: {
        name,
        description,
        category: input.category,
        monthlyPriceCents: Math.round(input.monthlyPriceEuros * 100),
        includedUsageUnits: hasCap ? includedUnits : null,
        usageUnit: hasCap ? input.usageUnit : null,
        overageUnitPriceCents: hasCap
          ? Math.round((input.overageUnitEuros ?? 0) * 100)
          : null,
        sortOrder: input.sortOrder,
      },
    });

    const changes = await describeServiceChanges(before, after);
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
