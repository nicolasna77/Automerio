"use client";

import { useTranslations } from "next-intl";
import { PageTabs } from "@/components/page-tabs";

export const SUBSCRIPTIONS_PATH = "/dashboard/subscriptions";
export const PAYMENTS_PATH = "/dashboard/payments";

// Facturation : abonnements et factures, deux onglets d'une même entrée de
// la navigation, chacun à son adresse.
export function BillingTabs() {
  const t = useTranslations("Dashboard.billing.tabs");
  return (
    <PageTabs
      label={t("label")}
      tabs={[
        { href: SUBSCRIPTIONS_PATH, label: t("subscriptions") },
        { href: PAYMENTS_PATH, label: t("invoices") },
      ]}
    />
  );
}
