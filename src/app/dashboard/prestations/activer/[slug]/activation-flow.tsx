"use client";

import { useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, PhoneForwarded } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  asStringArray,
  findMissingRequiredField,
  formatCents,
  formatConfigField,
  formatPrice,
  isFieldEmpty,
  isFieldVisible,
  PRODUCT_CATALOG_FIELD_KEY,
  TELEPHONY_SERVICE_SLUGS,
  type Configuration,
  type ServiceDTO,
} from "@/lib/catalog";
import { unwrap } from "@/lib/action-result";
import { formatUsageCap } from "@/lib/usage-cap";
import { SubscriptionMinutesSlider } from "@/components/subscription/subscription-minutes-slider";
import { calculateMonthlyPriceCents } from "@/lib/subscription-pricing";
import { excludingVatSuffix, formatCentsWithVat } from "@/lib/vat";
import { cn, getErrorMessage } from "@/lib/utils";
import { activateService, previewPromoCode, type PromoPreview } from "@/app/dashboard/actions";
import { ConfigFieldsForm } from "@/app/dashboard/config-fields";

type AppliedPreview = Extract<PromoPreview, { ok: true }>;

type PromoState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "applied"; preview: AppliedPreview }
  | { status: "error"; reason: string };

const STEPS = ["Réglages", "Récapitulatif et paiement"] as const;

export function ActivationFlow({
  service,
  organizationId,
  initialUnits = null,
}: {
  service: ServiceDTO;
  organizationId: string;
  /** Le volume deja choisi sur la page publique de la solution. */
  initialUnits?: number | null;
}) {
  const nameFieldId = useId();
  const promoFieldId = useId();
  const promoMessageId = useId();
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<0 | 1>(0);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(service.name);
  const [values, setValues] = useState<Configuration>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Le quota part du volume choisi sur la page publique s'il y en a un, sinon
  // du plancher : rester la coute le prix du catalogue, et le client voit ce
  // qu'il paierait sans rien decider.
  const [chosenUnits, setChosenUnits] = useState(
    initialUnits ?? service.tier?.minUnits ?? 0
  );
  const [promoInput, setPromoInput] = useState("");

  // Le prix a montrer : celui du quota choisi quand la solution est
  // personnalisable, celui du catalogue sinon. Le serveur le recalcule de son
  // cote avant de facturer — celui-ci n'est qu'un affichage.
  const monthlyPriceCents = service.tier
    ? calculateMonthlyPriceCents(service.tier, chosenUnits)
    : service.monthlyPriceCents;
  const [promo, setPromo] = useState<PromoState>({ status: "idle" });

  const takesOrders =
    service.configFields.some((field) => field.key === PRODUCT_CATALOG_FIELD_KEY) &&
    asStringArray(values.objectives).includes("order");
  const summary = service.configFields.filter(
    (field) =>
      field.key !== PRODUCT_CATALOG_FIELD_KEY &&
      field.type !== "consent" &&
      isFieldVisible(field, values) &&
      !isFieldEmpty(field, values)
  );

  function goToStep(next: 0 | 1) {
    setStep(next);
    requestAnimationFrame(() => {
      stepHeadingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function handleContinue() {
    const missing = findMissingRequiredField(service.configFields, values);
    if (!name.trim() || missing) {
      setSubmitAttempted(true);
      if (!name.trim()) {
        toast.error("Donnez un nom à cette activation.");
        document.getElementById(nameFieldId)?.focus();
      } else if (missing) {
        toast.error(`Le champ « ${missing.label} » est requis.`);
        document.getElementById(missing.key)?.focus();
      }
      return;
    }
    goToStep(1);
  }

  async function checkPromo(): Promise<PromoPreview | null> {
    const code = promoInput.trim();
    if (!code) return null;
    setPromo({ status: "checking" });
    try {
      const result = await previewPromoCode(service.id, code);
      setPromo(result.ok ? { status: "applied", preview: result } : { status: "error", reason: result.reason });
      return result;
    } catch {
      const reason = "La vérification du code a échoué. Réessayez.";
      setPromo({ status: "error", reason });
      return { ok: false, reason };
    }
  }

  function handlePay() {
    startTransition(async () => {
      let code: string | null = null;
      if (promoInput.trim()) {
        const preview = promo.status === "applied" ? promo.preview : await checkPromo();
        if (!preview?.ok) {
          document.getElementById(promoFieldId)?.focus();
          return;
        }
        code = preview.code;
      }
      try {
        const { checkoutUrl } = unwrap(
          await activateService(
            service.id,
            organizationId,
            name.trim(),
            values,
            code,
            service.tier ? chosenUnits : null
          )
        );
        window.location.href = checkoutUrl;
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="mt-8 space-y-6">
      <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Étapes de l'activation">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={cn(
              "flex items-center gap-2",
              index === step ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                index < step
                  ? "bg-primary text-primary-foreground"
                  : index === step
                    ? "border-2 border-primary text-foreground"
                    : "border border-border"
              )}
            >
              {index < step ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span>
              <span className="sr-only">Étape {index + 1} sur {STEPS.length} : </span>
              {label}
            </span>
          </li>
        ))}
      </ol>

      <h2 ref={stepHeadingRef} tabIndex={-1} className="sr-only">
        {STEPS[step]}
      </h2>

      {step === 0 ? (
        <>
          {TELEPHONY_SERVICE_SLUGS.has(service.slug) && (
            <div className="flex items-start gap-3 rounded-3xl border border-border bg-muted/40 p-4 text-sm">
              <PhoneForwarded className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Vous gardez votre numéro actuel.</span>{" "}
                Un numéro dédié à l&apos;IA vous est attribué, et un simple renvoi d&apos;appel, gratuit
                et réversible, y dirige vos clients une fois la solution active.
              </p>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="text-base">Réglages</CardTitle>
              <CardDescription>Modifiables à tout moment une fois la solution activée.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {service.tier && (
                <div className="space-y-3 rounded-2xl border border-border p-4">
                  <SubscriptionMinutesSlider
                    tier={service.tier}
                    value={chosenUnits}
                    onChange={setChosenUnits}
                    label="Combien de minutes vous faut-il ?"
                    disabled={isPending}
                  />
                  <p className="text-sm text-muted-foreground">
                    Au-delà de ce quota, chaque minute est facturée au tarif de
                    dépassement. L&apos;acheter à l&apos;avance revient moins cher.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor={nameFieldId}>Nom de cette activation</Label>
                <Input
                  id={nameFieldId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={submitAttempted && !name.trim()}
                  aria-describedby={`${nameFieldId}-help`}
                />
                <p id={`${nameFieldId}-help`} className="text-xs text-muted-foreground">
                  Utile si vous activez la même solution plusieurs fois, pour plusieurs boutiques par exemple.
                </p>
              </div>

              <ConfigFieldsForm
                fields={service.configFields}
                values={values}
                onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
                submitAttempted={submitAttempted}
                omitKeys={[PRODUCT_CATALOG_FIELD_KEY]}
              />

              {takesOrders && (
                <p className="rounded-2xl bg-muted/50 p-3 text-sm text-muted-foreground">
                  Vous ajouterez votre carte après le paiement, depuis la page de la solution : une photo
                  ou un PDF suffit.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href="/dashboard/prestations/catalogue"
              className={buttonVariants({ variant: "outline" })}
            >
              Annuler
            </Link>
            <Button type="button" onClick={handleContinue}>
              Continuer vers le récapitulatif
            </Button>
          </div>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="text-base">Récapitulatif</CardTitle>
              <CardDescription>Vérifiez les informations avant de payer.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border text-sm">
                <div className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-4">
                  <dt className="text-muted-foreground">Solution</dt>
                  <dd className="text-foreground">{service.name}</dd>
                </div>
                <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-4">
                  <dt className="text-muted-foreground">Nom de l&apos;activation</dt>
                  <dd className="text-foreground">{name.trim()}</dd>
                </div>
                {summary.map((field) => (
                  <div key={field.key} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-4">
                    <dt className="text-muted-foreground">{field.label}</dt>
                    <dd className="break-words text-foreground">
                      {formatConfigField(field, field.key, values[field.key])}
                    </dd>
                  </div>
                ))}
              </dl>
              <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => goToStep(0)}>
                Modifier les réglages
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="text-base">Paiement</CardTitle>
              <CardDescription>
                Paiement sécurisé par Stripe. Prélèvement au montant TTC, sans engagement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="space-y-2 text-sm">
                {monthlyPriceCents !== null && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Abonnement</dt>
                    <dd className="text-right font-medium text-foreground tabular-nums">
                      {formatCents(monthlyPriceCents)} TTC par mois
                      <span className="block text-xs font-normal text-muted-foreground">
                        {excludingVatSuffix(monthlyPriceCents)}
                      </span>
                    </dd>
                  </div>
                )}
                {service.usageCap && (
                  <p className="text-xs text-muted-foreground">
                    {formatUsageCap(service.usageCap)}
                  </p>
                )}
              </dl>

              <div className="space-y-2 border-t border-border pt-5">
                <Label htmlFor={promoFieldId}>
                  Code promo <span className="font-normal text-muted-foreground">(facultatif)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={promoFieldId}
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value);
                      if (promo.status !== "idle") setPromo({ status: "idle" });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void checkPromo();
                      }
                    }}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    className="uppercase"
                    aria-invalid={promo.status === "error"}
                    aria-describedby={promoMessageId}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void checkPromo()}
                    disabled={!promoInput.trim() || promo.status === "checking" || isPending}
                  >
                    {promo.status === "checking" ? "Vérification…" : "Appliquer"}
                  </Button>
                </div>
                <div id={promoMessageId} aria-live="polite">
                  {promo.status === "applied" && (
                    <p className="flex items-start gap-1.5 text-sm text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>
                        {promo.preview.description}. Premier paiement :{" "}
                        <span className="font-medium tabular-nums">
                          {formatCentsWithVat(promo.preview.discountedFirstPaymentCents)}
                        </span>{" "}
                        au lieu de{" "}
                        <span className="text-muted-foreground tabular-nums line-through">
                          {formatCents(promo.preview.firstPaymentCents)}
                        </span>
                        .
                      </span>
                    </p>
                  )}
                  {promo.status === "error" && <p className="text-sm text-destructive">{promo.reason}</p>}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                En payant, vous acceptez nos{" "}
                <Link href="/cgv" target="_blank" className="underline underline-offset-4 hover:text-foreground">
                  conditions générales de vente
                </Link>
                .
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => goToStep(0)} disabled={isPending}>
              Retour
            </Button>
            <Button type="button" onClick={handlePay} disabled={isPending} aria-busy={isPending}>
              {isPending
                ? "Redirection vers le paiement…"
                : `Payer ${formatPrice(monthlyPriceCents)} TTC`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
