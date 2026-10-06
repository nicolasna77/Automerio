"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { CheckCircle2, Info, Loader2, X } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientServiceStatus } from "@/lib/catalog";

const MAX_POLL_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 3000;

export function CheckoutNotice({
  status,
  serviceName,
  initialStatus,
  nextStep,
}: {
  status: "success" | "canceled";
  serviceName?: string;
  initialStatus?: ClientServiceStatus;
  nextStep?: { cta: string; href: string } | null;
}) {
  const router = useRouter();
  const t = useTranslations("Dashboard.checkout");
  const [dismissed, setDismissed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const attemptsRef = useRef(0);

  const awaitingPayment =
    status === "success" &&
    (initialStatus === undefined || initialStatus === "PENDING_PAYMENT");
  const timedOut = attempts >= MAX_POLL_ATTEMPTS;

  useEffect(() => {
    if (!awaitingPayment || timedOut || dismissed) return;
    const id = setTimeout(() => {
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [awaitingPayment, timedOut, dismissed, attempts, router]);

  if (dismissed) return null;

  return (
    <Alert
      className={cn(
        "mb-8",
        status === "success" && "border-primary/30 bg-primary/5"
      )}
    >
      {status === "canceled" ? (
        <Info aria-hidden="true" />
      ) : awaitingPayment ? (
        <Loader2 className="animate-spin text-primary" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="text-primary" aria-hidden="true" />
      )}
      <AlertTitle>
        {status === "canceled"
          ? t("canceledTitle")
          : awaitingPayment
            ? serviceName
              ? t("receivedTitleFor", { name: serviceName })
              : t("receivedTitle")
            : serviceName
              ? t("confirmedTitleFor", { name: serviceName })
              : t("confirmedTitle")}
      </AlertTitle>
      <AlertDescription>
        {status === "canceled" && t("canceled")}
        {status === "success" &&
          awaitingPayment &&
          !timedOut &&
          t("recording")}
        {status === "success" &&
          awaitingPayment &&
          timedOut &&
          t("slow")}
        {status === "success" &&
          !awaitingPayment &&
          (nextStep ? t("nextStep") : initialStatus === "CONFIGURING" ? t("configuring") : t("active"))}
        {status === "success" && nextStep && (
          <div className="mt-3">
            <Link href={nextStep.href} className={buttonVariants({ size: "sm" })}>
              {nextStep.cta}
            </Link>
          </div>
        )}
      </AlertDescription>
      <AlertAction>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDismissed(true)}
          aria-label={t("dismiss")}
        >
          <X aria-hidden="true" />
        </Button>
      </AlertAction>
    </Alert>
  );
}
