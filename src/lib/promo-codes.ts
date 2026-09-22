import { formatCents } from "@/lib/catalog";
import { formatCentsExcludingVat } from "@/lib/vat";

export type DiscountDuration = "once" | "repeating" | "forever";

export type DiscountRule = {
  percentOff: number | null;
  amountOffCents: number | null;
  duration: DiscountDuration;
  durationInMonths: number | null;
};

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export const PROMO_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,29}$/;

function toDiscountDuration(duration: string): DiscountDuration {
  return duration === "repeating" || duration === "forever" ? duration : "once";
}

export function discountRuleFromCoupon(coupon: {
  percent_off: number | null;
  amount_off: number | null;
  duration: string;
  duration_in_months: number | null;
}): DiscountRule {
  return {
    percentOff: coupon.percent_off,
    amountOffCents: coupon.amount_off,
    duration: toDiscountDuration(coupon.duration),
    durationInMonths: coupon.duration_in_months,
  };
}

function formatPercent(percent: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(percent)} %`;
}

export function describeDiscount(
  rule: DiscountRule,
  pricing: { hasSetupFee: boolean; hasSubscription: boolean }
): string {
  const isPercent = rule.percentOff !== null;
  const amount = isPercent
    ? `−${formatPercent(rule.percentOff!)}`
    : `−${formatCents(rule.amountOffCents ?? 0)} TTC (−${formatCentsExcludingVat(
        rule.amountOffCents ?? 0
      )} HT)`;

  if (!pricing.hasSubscription) return `${amount} sur le paiement`;

  const setupClause = isPercent && pricing.hasSetupFee ? ", mise en place comprise" : "";
  const months = rule.durationInMonths ?? 1;

  if (rule.duration === "once" || (rule.duration === "repeating" && months === 1)) {
    return `${amount} sur le premier paiement${setupClause}`;
  }
  if (rule.duration === "repeating") {
    return isPercent
      ? `${amount} pendant ${months} mois${setupClause}`
      : `${amount} sur chacun des ${months} premiers paiements`;
  }
  return isPercent
    ? `${amount} sur tous les paiements${setupClause}`
    : `${amount} sur chaque paiement`;
}

export function firstPaymentCents(pricing: {
  setupFeeCents: number | null;
  monthlyPriceCents: number | null;
}): number {
  return (pricing.setupFeeCents ?? 0) + (pricing.monthlyPriceCents ?? 0);
}

export function applyDiscount(totalCents: number, rule: DiscountRule): number {
  if (rule.percentOff !== null) {
    return Math.round((totalCents * (100 - rule.percentOff)) / 100);
  }
  return Math.max(0, totalCents - (rule.amountOffCents ?? 0));
}

export const SERVICES_METADATA_KEY = "services";

export function allowedServiceSlugs(
  metadata: Record<string, string> | null | undefined
): string[] | null {
  const raw = metadata?.[SERVICES_METADATA_KEY]?.trim();
  if (!raw) return null;
  return raw
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

export type PromotionCodeLike = {
  expires_at: number | null;
  max_redemptions: number | null;
  times_redeemed: number;
  metadata: Record<string, string> | null;
  coupon: { valid: boolean } | null;
};

export function redeemabilityProblem(
  promo: PromotionCodeLike,
  serviceSlug: string,
  nowMs: number
): string | null {
  if (!promo.coupon?.valid) return "Ce code n'est plus valable.";
  if (promo.expires_at !== null && promo.expires_at * 1000 <= nowMs) {
    return "Ce code a expiré.";
  }
  if (promo.max_redemptions !== null && promo.times_redeemed >= promo.max_redemptions) {
    return "Ce code a déjà servi le nombre de fois prévu.";
  }
  const allowed = allowedServiceSlugs(promo.metadata);
  if (allowed !== null && !allowed.includes(serviceSlug)) {
    return "Ce code ne s'applique pas à cette solution.";
  }
  return null;
}

export type PromoCodeFormInput = {
  code: string;
  kind: "percent" | "amount";
  value: number;
  duration: DiscountDuration;
  durationInMonths: number | null;
  expiresAtMs: number | null;
  maxRedemptions: number | null;
  firstTimeOnly: boolean;
  serviceSlugs: string[];
};

export type ParsedPromoCode = {
  code: string;
  rule: DiscountRule;
  expiresAt: number | null;
  maxRedemptions: number | null;
  firstTimeOnly: boolean;
  serviceSlugs: string[];
};

export function parsePromoCodeInput(
  input: PromoCodeFormInput,
  nowMs: number
): { ok: true; value: ParsedPromoCode } | { ok: false; error: string } {
  const code = normalizePromoCode(input.code);
  if (!PROMO_CODE_PATTERN.test(code)) {
    return {
      ok: false,
      error: "Le code doit faire de 3 à 30 caractères : lettres, chiffres, tirets.",
    };
  }

  const discount = parseDiscountRule(input);
  if (!discount.ok) return discount;

  if (input.expiresAtMs !== null && input.expiresAtMs <= nowMs) {
    return { ok: false, error: "La date d'expiration doit être dans le futur." };
  }

  if (
    input.maxRedemptions !== null &&
    (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1)
  ) {
    return { ok: false, error: "Le nombre d'utilisations doit être un entier positif." };
  }

  return {
    ok: true,
    value: {
      code,
      rule: discount.rule,
      expiresAt: input.expiresAtMs === null ? null : Math.floor(input.expiresAtMs / 1000),
      maxRedemptions: input.maxRedemptions,
      firstTimeOnly: input.firstTimeOnly,
      serviceSlugs: [...new Set(input.serviceSlugs)],
    },
  };
}

export function parseDiscountRule(
  input: Pick<PromoCodeFormInput, "kind" | "value" | "duration" | "durationInMonths">
): { ok: true; rule: DiscountRule } | { ok: false; error: string } {
  let percentOff: number | null = null;
  let amountOffCents: number | null = null;
  if (input.kind === "percent") {
    if (!Number.isFinite(input.value) || input.value <= 0 || input.value > 100) {
      return { ok: false, error: "Le pourcentage doit être compris entre 0 (exclu) et 100." };
    }
    percentOff = Math.round(input.value * 100) / 100;
  } else {
    const cents = Math.round(input.value * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      return { ok: false, error: "Le montant de la remise doit être positif." };
    }
    amountOffCents = cents;
  }

  let durationInMonths: number | null = null;
  if (input.duration === "repeating") {
    const months = input.durationInMonths;
    if (months === null || !Number.isInteger(months) || months < 1 || months > 36) {
      return { ok: false, error: "Indiquez une durée entre 1 et 36 mois." };
    }
    durationInMonths = months;
  }

  return {
    ok: true,
    rule: { percentOff, amountOffCents, duration: input.duration, durationInMonths },
  };
}
