"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Settings } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ResumeCheckoutButton } from "../resume-checkout-button";
import { CancelServiceButton } from "../service-detail-actions";
import type { MySubscription } from "@/lib/subscriptions";
import { BILLING_SECTION_ID } from "../billing-section";

export function SubscriptionActions({
  subscription,
  running,
}: {
  subscription: MySubscription;
  // Calculé côté serveur : @/lib/subscriptions lit la base, on ne l'importe
  // pas dans un composant client.
  running: boolean;
}) {
  const tSubscriptions = useTranslations("Dashboard.subscriptions");
  const { status, name, clientServiceId } = subscription;

  if (status === "PENDING_PAYMENT" || status === "CANCELED") {
    return <ResumeCheckoutButton clientServiceId={clientServiceId} status={status} />;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CancelServiceButton clientServiceId={clientServiceId} name={name} variant="ghost" />
      {/* L'onglet Abonnement des réglages n'existe que si l'abonnement court. */}
      {running && (
        <Link
          href={`/dashboard/services/${clientServiceId}/configuration#${BILLING_SECTION_ID}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Settings data-icon="inline-start" aria-hidden="true" />
          {tSubscriptions("settings")}
        </Link>
      )}
    </div>
  );
}
