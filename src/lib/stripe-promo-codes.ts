import type Stripe from "stripe";
import { stripeClient } from "@/lib/auth";
import {
  SERVICES_METADATA_KEY,
  discountRuleFromCoupon,
  normalizePromoCode,
  redeemabilityProblem,
  type DiscountRule,
  type ParsedPromoCode,
} from "@/lib/promo-codes";

const SOURCE_METADATA = { source: "automerio-admin" };

export function couponOf(promo: Stripe.PromotionCode): Stripe.Coupon | null {
  const coupon = promo.promotion.coupon;
  if (!coupon || typeof coupon === "string" || ("deleted" in coupon && coupon.deleted)) return null;
  return coupon;
}

const MAX_LISTED_PROMOTION_CODES = 1000;

export async function listPromotionCodes(): Promise<Stripe.PromotionCode[]> {
  return stripeClient.promotionCodes
    .list({ limit: 100, expand: ["data.promotion.coupon"] })
    .autoPagingToArray({ limit: MAX_LISTED_PROMOTION_CODES });
}

export async function createPromotionCode(input: ParsedPromoCode): Promise<Stripe.PromotionCode> {
  const { rule } = input;
  const coupon = await stripeClient.coupons.create({
    name: input.code,
    duration: rule.duration,
    ...(rule.duration === "repeating" &&
      rule.durationInMonths !== null && { duration_in_months: rule.durationInMonths }),
    ...(rule.percentOff !== null
      ? { percent_off: rule.percentOff }
      : { amount_off: rule.amountOffCents ?? 0, currency: "eur" }),
    metadata: SOURCE_METADATA,
  });

  try {
    return await stripeClient.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code: input.code,
      ...(input.expiresAt !== null && { expires_at: input.expiresAt }),
      ...(input.maxRedemptions !== null && { max_redemptions: input.maxRedemptions }),
      ...(input.firstTimeOnly && { restrictions: { first_time_transaction: true } }),
      metadata: {
        ...SOURCE_METADATA,
        ...(input.serviceSlugs.length > 0 && {
          [SERVICES_METADATA_KEY]: input.serviceSlugs.join(","),
        }),
      },
    });
  } catch (err) {
    await stripeClient.coupons.del(coupon.id).catch(() => undefined);
    throw err;
  }
}

export async function deactivatePromotionCode(id: string): Promise<Stripe.PromotionCode> {
  return stripeClient.promotionCodes.update(id, { active: false });
}

export type PromoValidation =
  | { ok: true; promotionCodeId: string; code: string; rule: DiscountRule }
  | { ok: false; reason: string };

export async function validatePromoCodeForService(
  rawCode: string,
  serviceSlug: string
): Promise<PromoValidation> {
  const code = normalizePromoCode(rawCode);
  if (!code) return { ok: false, reason: "Saisissez un code promo." };

  const { data } = await stripeClient.promotionCodes.list({
    code,
    active: true,
    limit: 1,
    expand: ["data.promotion.coupon"],
  });
  const promo = data[0];
  if (!promo) return { ok: false, reason: "Ce code n'existe pas ou n'est plus valable." };

  const coupon = couponOf(promo);
  const problem = redeemabilityProblem(
    {
      expires_at: promo.expires_at,
      max_redemptions: promo.max_redemptions,
      times_redeemed: promo.times_redeemed,
      metadata: promo.metadata,
      coupon,
    },
    serviceSlug,
    Date.now()
  );
  if (problem || !coupon) return { ok: false, reason: problem ?? "Ce code n'est plus valable." };

  return {
    ok: true,
    promotionCodeId: promo.id,
    code: promo.code,
    rule: discountRuleFromCoupon(coupon),
  };
}
