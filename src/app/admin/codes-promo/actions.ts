"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logAdminAction } from "@/lib/audit";
import { createPromotionCode, deactivatePromotionCode } from "@/lib/stripe-promo-codes";
import {
  describeDiscount,
  parsePromoCodeInput,
  type PromoCodeFormInput,
} from "@/lib/promo-codes";

type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function createPromoCodeAction(
  input: PromoCodeFormInput
): Promise<ActionResult<{ code: string }>> {
  const session = await requireAdmin();

  const parsed = parsePromoCodeInput(input, Date.now());
  if (!parsed.ok) return parsed;

  const { serviceSlugs } = parsed.value;
  if (serviceSlugs.length > 0) {
    const known = await db.service.count({ where: { slug: { in: serviceSlugs } } });
    if (known !== serviceSlugs.length) {
      return { ok: false, error: "Une des solutions choisies n'existe plus. Rechargez la page." };
    }
  }

  let promo;
  try {
    promo = await createPromotionCode(parsed.value);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/already exists/i.test(message)) {
      return { ok: false, error: `Un code « ${parsed.value.code} » est déjà actif.` };
    }
    console.error("[codes-promo] création refusée par Stripe :", err);
    return { ok: false, error: "Stripe a refusé la création du code. Réessayez." };
  }

  await logAdminAction({
    actor: session.user,
    action: "PROMO_CODE_CREATED",
    target: { type: "promo_code", id: promo.id, label: promo.code },
    detail: describeDiscount(parsed.value.rule),
  });

  revalidatePath("/admin/codes-promo");
  return { ok: true, code: promo.code };
}

export async function deactivatePromoCodeAction(id: string, code: string): Promise<ActionResult> {
  const session = await requireAdmin();

  try {
    await deactivatePromotionCode(id);
  } catch (err) {
    console.error("[codes-promo] désactivation refusée par Stripe :", err);
    return { ok: false, error: "Stripe a refusé la désactivation. Réessayez." };
  }

  await logAdminAction({
    actor: session.user,
    action: "PROMO_CODE_DEACTIVATED",
    target: { type: "promo_code", id, label: code },
  });

  revalidatePath("/admin/codes-promo");
  return { ok: true };
}
