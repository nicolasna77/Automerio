import { titleMetadata } from "@/i18n/metadata";
import { getTranslations } from "next-intl/server";
import { CloudOff, TicketPercent } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { EmptyState } from "@/components/empty-state";
import { couponOf, listPromotionCodes } from "@/lib/stripe-promo-codes";
import {
  allowedServiceSlugs,
  describeDiscount,
  discountRuleFromCoupon,
} from "@/lib/promo-codes";
import { PromoCodeCreateDialog } from "./promo-code-create-dialog";
import { PromoCodesTable, type PromoCodeRow, type PromoCodeState } from "./promo-codes-table";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("adminPromoCodes");

async function loadPromoCodes(
  codesPromise: ReturnType<typeof listPromotionCodes>,
  nameBySlug: Map<string, string>,
  discountDeleted: string
): Promise<PromoCodeRow[] | null> {
  try {
    const codes = await codesPromise;
    const now = Date.now();
    return codes.map((promo) => {
      const coupon = couponOf(promo);
      const slugs = allowedServiceSlugs(promo.metadata);
      const expired = promo.expires_at !== null && promo.expires_at * 1000 <= now;
      const exhausted =
        promo.max_redemptions !== null && promo.times_redeemed >= promo.max_redemptions;
      const state: PromoCodeState = !promo.active
        ? "inactive"
        : expired || !coupon?.valid
          ? "expired"
          : exhausted
            ? "exhausted"
            : "active";

      return {
        id: promo.id,
        code: promo.code,
        state,
        discount: coupon
          ? describeDiscount(discountRuleFromCoupon(coupon))
          : discountDeleted,
        services: slugs === null ? null : slugs.map((slug) => nameBySlug.get(slug) ?? slug),
        firstTimeOnly: promo.restrictions.first_time_transaction,
        timesRedeemed: promo.times_redeemed,
        maxRedemptions: promo.max_redemptions,
        expiresAt: promo.expires_at === null ? null : new Date(promo.expires_at * 1000),
      };
    });
  } catch (err) {
    console.error("[codes-promo] Stripe injoignable :", err);
    return null;
  }
}

export default async function AdminPromoCodesPage() {
  await requireAdmin();
  const t = await getTranslations("Admin.promoCodes");

  const codesPromise = listPromotionCodes();
  codesPromise.catch(() => {});
  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });
  const rows = await loadPromoCodes(
    codesPromise,
    new Map(services.map((s) => [s.slug, s.name])),
    t("discountDeleted")
  );

  return (
    <PageShell size="wide">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<PromoCodeCreateDialog services={services} />}
      />

      <div>
        {rows === null ? (
          <EmptyState
            icon={CloudOff}
            tone="neutral"
            title={t("stripeDownTitle")}
            description={t("stripeDownDescription")}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={TicketPercent}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <div className="rounded-3xl border border-border bg-card p-2">
            <PromoCodesTable rows={rows} />
          </div>
        )}
      </div>
    </PageShell>
  );
}
