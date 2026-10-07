"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logAdminAction } from "@/lib/audit";
import { actionError, runAction } from "@/lib/run-action";
import { createPromotionCode, deactivatePromotionCode } from "@/lib/stripe-promo-codes";
import {
  describeDiscount,
  parsePromoCodeInput,
  type PromoCodeFormInput,
} from "@/lib/promo-codes";

export async function createPromoCodeAction(input: PromoCodeFormInput) {
  return runAction(async () => {
    const session = await requireAdmin();

    const parsed = parsePromoCodeInput(input, Date.now());
    if (!parsed.ok) throw actionError(parsed.problem);

    const { serviceSlugs } = parsed.value;
    if (serviceSlugs.length > 0) {
      const known = await db.service.count({ where: { slug: { in: serviceSlugs } } });
      if (known !== serviceSlugs.length) throw actionError("promoServiceGone");
    }

    let promo;
    try {
      promo = await createPromotionCode(parsed.value);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/already exists/i.test(message)) {
        throw actionError("promoCodeExists", { code: parsed.value.code });
      }
      console.error("[codes-promo] création refusée par Stripe :", err);
      throw actionError("promoCreateRejected");
    }

    await logAdminAction({
      actor: session.user,
      action: "PROMO_CODE_CREATED",
      target: { type: "promo_code", id: promo.id, label: promo.code },
      detail: describeDiscount(parsed.value.rule),
    });

    revalidatePath("/admin/promo-codes");
    return { code: promo.code };
  });
}

export async function deactivatePromoCodeAction(id: string, code: string) {
  return runAction(async () => {
    const session = await requireAdmin();

    try {
      await deactivatePromotionCode(id);
    } catch (err) {
      console.error("[codes-promo] désactivation refusée par Stripe :", err);
      throw actionError("promoDeactivateRejected");
    }

    await logAdminAction({
      actor: session.user,
      action: "PROMO_CODE_DEACTIVATED",
      target: { type: "promo_code", id, label: code },
    });

    revalidatePath("/admin/promo-codes");
  });
}
