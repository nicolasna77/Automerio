import type { Metadata } from "next";
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

export const metadata: Metadata = { title: "Codes promo" };

async function loadPromoCodes(nameBySlug: Map<string, string>): Promise<PromoCodeRow[] | null> {
  try {
    const codes = await listPromotionCodes();
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
          : "Remise supprimée dans Stripe",
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

  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });
  const rows = await loadPromoCodes(new Map(services.map((s) => [s.slug, s.name])));

  return (
    <PageShell size="wide">
      <PageHeader
        title="Codes promo"
        description="Les remises que vos clients saisissent en activant une solution. Stripe compte les utilisations et fait respecter les limites."
        actions={<PromoCodeCreateDialog services={services} />}
      />

      <div>
        {rows === null ? (
          <EmptyState
            icon={CloudOff}
            tone="neutral"
            title="Impossible de joindre Stripe"
            description="Les codes ne peuvent pas être affichés pour l'instant. Vérifiez STRIPE_SECRET_KEY, puis rechargez la page."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={TicketPercent}
            title="Aucun code promo"
            description="Créez un premier code : vos clients pourront le saisir au moment d'activer une solution."
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
