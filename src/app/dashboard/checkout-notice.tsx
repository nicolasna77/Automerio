"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const [dismissed, setDismissed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const attemptsRef = useRef(0);

  // Le webhook Stripe fait passer la solution de PENDING_PAYMENT a CONFIGURING,
  // et s'arrete la : le passage a ACTIVE est une action manuelle de l'equipe,
  // des jours plus tard. On attend donc que le paiement soit enregistre, pas
  // que la solution soit active, sans quoi chaque achat finit par annoncer un
  // retard qui n'existe pas.
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
          ? "Paiement annulé"
          : awaitingPayment
            ? `Paiement reçu${serviceName ? ` pour « ${serviceName} »` : ""}`
            : `Paiement confirmé${serviceName ? ` pour « ${serviceName} »` : ""}`}
      </AlertTitle>
      <AlertDescription>
        {status === "canceled" &&
          "Aucun paiement n'a été effectué. Vous pouvez réessayer quand vous le souhaitez depuis le catalogue ci-dessous."}
        {status === "success" &&
          awaitingPayment &&
          !timedOut &&
          "Nous enregistrons votre paiement, cela ne prend que quelques secondes…"}
        {status === "success" &&
          awaitingPayment &&
          timedOut &&
          "L'enregistrement du paiement prend plus de temps que prévu. Actualisez la page dans un instant, ou contactez-nous si le problème persiste."}
        {status === "success" &&
          !awaitingPayment &&
          (nextStep
            ? "Il reste une étape pour que votre assistant puisse répondre."
            : initialStatus === "CONFIGURING"
              ? "Notre équipe installe votre solution et vous prévient dès qu'elle est active."
              : "Votre solution est active. Retrouvez-la dans « Mes solutions » ci-dessous.")}
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
          aria-label="Fermer ce message"
        >
          <X aria-hidden="true" />
        </Button>
      </AlertAction>
    </Alert>
  );
}
