"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Phone, Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { searchPhoneNumbers, purchasePhoneNumberForService } from "./actions";

type AvailableNumber = {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
};

export function PhoneNumberPurchase({
  clientServiceId,
}: {
  clientServiceId: string;
}) {
  const [results, setResults] = useState<AvailableNumber[] | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isPurchasing, startPurchase] = useTransition();
  const [confirmNumber, setConfirmNumber] = useState<AvailableNumber | null>(null);

  function handleSearch() {
    startSearch(async () => {
      try {
        setResults(unwrap(await searchPhoneNumbers(clientServiceId)));
      } catch (err) {
        toast.error(
          getErrorMessage(err)
        );
      }
    });
  }

  function handlePurchase() {
    if (!confirmNumber) return;
    startPurchase(async () => {
      try {
        unwrap(await purchasePhoneNumberForService(clientServiceId, confirmNumber.phoneNumber));
        toast.success(`Numéro ${confirmNumber.phoneNumber} activé.`);
        setConfirmNumber(null);
      } catch (err) {
        toast.error(
          getErrorMessage(err)
        );
      }
    });
  }

  if (results === null) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleSearch}
        disabled={isSearching}
        aria-busy={isSearching}
      >
        {isSearching ? (
          <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />
        ) : (
          <Search aria-hidden="true" data-icon="inline-start" />
        )}
        Rechercher un numéro
      </Button>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun numéro disponible pour l&apos;instant — réessayez plus tard.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {results.map((number) => (
              <li
                key={number.phoneNumber}
                className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-2.5 text-sm"
              >
                <span className="flex items-center gap-2">
                  <Phone className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {number.phoneNumber}
                  {number.locality && (
                    <span className="text-xs text-muted-foreground">
                      {number.locality}
                    </span>
                  )}
                </span>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setConfirmNumber(number)}
                >
                  Choisir
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          variant="ghost"
          size="xs"
          onClick={handleSearch}
          disabled={isSearching}
          aria-busy={isSearching}
        >
          {isSearching ? "Recherche…" : "Actualiser la recherche"}
        </Button>
      </div>

      <AlertDialog
        open={!!confirmNumber}
        onOpenChange={(open) => !open && setConfirmNumber(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Activer le {confirmNumber?.phoneNumber} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ce numéro sera acheté immédiatement et rattaché à votre
              solution — le coût est couvert par votre abonnement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPurchasing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurchase}
              disabled={isPurchasing}
              aria-busy={isPurchasing}
            >
              {isPurchasing ? "Activation…" : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
