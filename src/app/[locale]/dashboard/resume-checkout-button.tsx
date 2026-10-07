"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unwrap } from "@/lib/action-result";
import { cn, getErrorMessage } from "@/lib/utils";
import { resumeServiceCheckout } from "./actions";

export function ResumeCheckoutButton({
  clientServiceId,
  status,
  fullWidth = false,
}: {
  clientServiceId: string;
  status: "PENDING_PAYMENT" | "CANCELED";
  fullWidth?: boolean;
}) {
  const t = useTranslations("Dashboard.checkout.resume");
  const tCommon = useTranslations("Common");
  const codeFieldId = useId();
  const [isPending, startTransition] = useTransition();
  const [promoOpen, setPromoOpen] = useState(false);
  const [code, setCode] = useState("");

  function resume(promoCode: string | null) {
    startTransition(async () => {
      try {
        const { checkoutUrl } = unwrap(await resumeServiceCheckout(clientServiceId, promoCode));
        window.location.href = checkoutUrl;
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <div className={cn("flex gap-2", fullWidth ? "w-full flex-col items-stretch" : "items-center")}>
      <Button
        className={cn(fullWidth && "w-full")}
        variant={status === "CANCELED" ? "outline" : "default"}
        onClick={() => resume(null)}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />
            {t("redirecting")}
          </>
        ) : status === "CANCELED" ? (
          t("reactivate")
        ) : (
          t("resume")
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setPromoOpen(true)}
        disabled={isPending}
      >
        {t("havePromo")}
      </Button>

      <Dialog
        open={promoOpen}
        onOpenChange={(next) => {
          setPromoOpen(next);
          if (!next) setCode("");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              resume(code);
            }}
          >
            <DialogHeader>
              <DialogTitle>{t("promoTitle")}</DialogTitle>
              <DialogDescription>{t("promoDescription")}</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2">
              <Label htmlFor={codeFieldId}>{t("promoLabel")}</Label>
              <Input
                id={codeFieldId}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="uppercase"
                required
              />
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPromoOpen(false)}
                disabled={isPending}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isPending || !code.trim()} aria-busy={isPending}>
                {isPending ? t("redirecting") : t("payWithCode")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
