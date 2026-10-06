"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  CreditCard,
  Package,
  PhoneForwarded,
  Pencil,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Stepper, type StepperStep } from "@/components/stepper";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  asStringArray,
  findInvalidWeeklyHours,
  findMissingRequiredField,
  formatCents,
  formatConfigField,
  formatPrice,
  isFieldEmpty,
  PRODUCT_CATALOG_FIELD_KEY,
  TELEPHONY_SERVICE_SLUGS,
  type Configuration,
  type ServiceDTO,
} from "@/lib/catalog";
import { unwrap } from "@/lib/action-result";
import { SubscriptionMinutesSlider } from "@/components/subscription/subscription-minutes-slider";
import { MonthlyPrice } from "@/components/monthly-price";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import { calculateMonthlyPriceCents } from "@/lib/subscription-pricing";
import { getErrorMessage } from "@/lib/utils";
import { activateService, previewPromoCode, type PromoPreview } from "@/app/[locale]/dashboard/actions";
import { ConfigFieldsForm } from "@/app/[locale]/dashboard/config-fields";
import { VoicePreview } from "@/app/[locale]/dashboard/voice-preview";
import {
  buildFieldCategories,
  settingsHiddenKeys,
  useDescribeCategory,
  type FieldCategory,
} from "@/app/[locale]/dashboard/field-categories";

type AppliedPreview = Extract<PromoPreview, { ok: true }>;

type PromoState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "applied"; preview: AppliedPreview }
  | { status: "error"; reason: string };

// Le parcours : la formule, une étape par catégorie de réglages présente pour
// cette solution, le récapitulatif, puis le paiement sur Stripe.
type FlowStep =
  | { kind: "plan" }
  | { kind: "fields"; category: FieldCategory }
  | { kind: "summary" };


export function ActivationFlow({
  service,
  organizationId,
  organizationName,
  initialUnits = null,
}: {
  service: ServiceDTO;
  organizationId: string;
  organizationName: string;
  initialUnits?: number | null;
}) {
  const tSimulator = useTranslations("PriceSimulator");
  const t = useTranslations("Dashboard.activation");
  const tCommon = useTranslations("Common");
  const describeCategory = useDescribeCategory();
  const price = usePriceFormatter();
  const PLAN_STEP = { title: t("steps.plan.title"), description: t("steps.plan.description"), icon: Package };
  const SUMMARY_STEP = { title: t("steps.summary.title"), description: t("steps.summary.description"), icon: ClipboardCheck };
  // Montrée pour que le client sache ce qui l'attend ; elle se passe sur Stripe.
  const PAYMENT_STEP: StepperStep = { title: t("steps.payment.title"), description: t("steps.payment.description"), icon: CreditCard };
  const nameFieldId = useId();
  const promoFieldId = useId();
  const promoMessageId = useId();
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(service.name);
  const [values, setValues] = useState<Configuration>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [chosenUnits, setChosenUnits] = useState(
    initialUnits ?? service.tier?.minUnits ?? 0
  );
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoState>({ status: "idle" });

  // Brouillon gardé dans ce navigateur : une page fermée par erreur ne fait
  // pas perdre les réponses. Repris au retour, effacé au paiement.
  const draftKey = `automerio:activation:${organizationId}:${service.slug}`;
  const draftRestored = useRef(false);
  useEffect(() => {
    const draft = readDraft(draftKey);
    draftRestored.current = true;
    if (!draft) return;
    /* eslint-disable react-hooks/set-state-in-effect -- le brouillon n'existe que dans le navigateur */
    setName(draft.name);
    setValues(draft.values);
    if (initialUnits === null && draft.chosenUnits !== null) setChosenUnits(draft.chosenUnits);
    setStepIndex(draft.stepIndex);
    /* eslint-enable react-hooks/set-state-in-effect */
    toast(t("draftRestored"), {
      action: {
        label: t("restart"),
        onClick: () => {
          clearDraft(draftKey);
          setName(service.name);
          setValues({});
          setChosenUnits(initialUnits ?? service.tier?.minUnits ?? 0);
          setStepIndex(0);
        },
      },
    });
  }, [draftKey, initialUnits, service.name, service.tier?.minUnits, t]);

  // Rien n'est gardé tant que le formulaire est dans son état initial : sans
  // cela, une simple visite laisserait un brouillon vide, repris à tort au
  // retour suivant.
  const defaultUnits = initialUnits ?? service.tier?.minUnits ?? 0;
  const pristine =
    name === service.name &&
    Object.keys(values).length === 0 &&
    stepIndex === 0 &&
    (!service.tier || chosenUnits === defaultUnits);
  useEffect(() => {
    if (!draftRestored.current) return;
    const timer = setTimeout(() => {
      if (pristine) {
        clearDraft(draftKey);
        return;
      }
      writeDraft(draftKey, {
        name,
        values,
        chosenUnits: service.tier ? chosenUnits : null,
        stepIndex,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [draftKey, name, values, chosenUnits, stepIndex, service.tier, pristine]);

  const monthlyPriceCents = service.tier
    ? calculateMonthlyPriceCents(service.tier, chosenUnits)
    : service.monthlyPriceCents;

  const categories = buildFieldCategories(
    service.configFields,
    values,
    [PRODUCT_CATALOG_FIELD_KEY, ...settingsHiddenKeys(service.slug)],
    describeCategory
  );
  const steps: FlowStep[] = [
    { kind: "plan" },
    ...categories.map((category) => ({ kind: "fields" as const, category })),
    { kind: "summary" },
  ];
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastBeforeSummary = stepIndex === steps.length - 2;
  const stepperSteps: StepperStep[] = [
    ...steps.map((s) =>
      s.kind === "plan" ? PLAN_STEP : s.kind === "summary" ? SUMMARY_STEP : s.category
    ),
    PAYMENT_STEP,
  ];
  const current = step.kind === "plan" ? PLAN_STEP : step.kind === "summary" ? SUMMARY_STEP : step.category;

  const takesOrders =
    service.configFields.some((field) => field.key === PRODUCT_CATALOG_FIELD_KEY) &&
    asStringArray(values.objectives).includes("order");

  function goToStep(next: number) {
    setStepIndex(next);
    setSubmitAttempted(false);
    requestAnimationFrame(() => {
      stepHeadingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Ne vérifie que l'étape affichée : les suivantes n'ont pas encore été vues.
  function handleContinue() {
    if (step.kind === "plan" && !name.trim()) {
      setSubmitAttempted(true);
      toast.error(t("nameRequired"));
      document.getElementById(nameFieldId)?.focus();
      return;
    }
    if (step.kind === "fields") {
      const badHours = findInvalidWeeklyHours(step.category.fields, values);
      if (badHours) {
        toast.error(t("invalidHours", { label: badHours.label }));
        document.getElementById(badHours.key)?.scrollIntoView({ block: "center" });
        return;
      }
      const missing = findMissingRequiredField(step.category.fields, values);
      if (missing) {
        setSubmitAttempted(true);
        toast.error(t("fieldRequired", { label: missing.label }));
        document.getElementById(missing.key)?.focus();
        return;
      }
    }
    goToStep(stepIndex + 1);
  }

  // Aller au récapitulatif sans parcourir les réglages facultatifs : ils
  // restent modifiables après l'activation, et l'équipe les vérifie à
  // l'installation. Un champ obligatoire encore vide ramène à son étape.
  function handleSkipToSummary() {
    if (!name.trim()) {
      goToStep(0);
      setSubmitAttempted(true);
      toast.error(t("nameRequired"));
      return;
    }
    for (let index = 1; index < steps.length - 1; index++) {
      const candidate = steps[index];
      if (candidate.kind !== "fields") continue;
      const missing = findMissingRequiredField(candidate.category.fields, values);
      if (missing) {
        goToStep(index);
        setSubmitAttempted(true);
        toast.error(t("fieldRequired", { label: missing.label }));
        return;
      }
    }
    goToStep(steps.length - 1);
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
      const reason = t("promoCheckFailed");
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
        clearDraft(draftKey);
        window.location.href = checkoutUrl;
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-lg border border-border bg-card px-2 py-6 sm:px-6">
        <Stepper
          label={t("steps.label")}
          steps={stepperSteps}
          current={stepIndex}
          onStepClick={goToStep}
        />
      </div>

      <div key={stepIndex} className="space-y-6 animate-in fade-in duration-150 motion-reduce:animate-none">
        {step.kind === "plan" && TELEPHONY_SERVICE_SLUGS.has(service.slug) && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <PhoneForwarded className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{t("keepNumber.title")}</span>{" "}
              {t("keepNumber.body")}
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <current.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="text-base font-semibold text-foreground outline-none"
                >
                  {current.title}
                </h2>
                {current.description && <CardDescription>{current.description}</CardDescription>}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {step.kind === "plan" && (
              <>
                {service.tier && (
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <SubscriptionMinutesSlider
                      tier={service.tier}
                      value={chosenUnits}
                      onChange={setChosenUnits}
                      label={tSimulator("question", { unit: service.tier.unit })}
                      disabled={isPending}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t("overage")}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor={nameFieldId}>{t("nameLabel")}</Label>
                  <Input
                    id={nameFieldId}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={submitAttempted && !name.trim()}
                    aria-describedby={`${nameFieldId}-help`}
                  />
                  <p id={`${nameFieldId}-help`} className="text-xs text-muted-foreground">
                    {t("nameHelp")}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t("editableLater")}
                </p>
              </>
            )}

            {step.kind === "fields" && (
              <>
                <ConfigFieldsForm
                  fields={step.category.fields}
                  values={values}
                  onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
                  submitAttempted={submitAttempted}
                  companyName={organizationName}
                />
                {step.category.id === "voice" && TELEPHONY_SERVICE_SLUGS.has(service.slug) && (
                  <VoicePreview target={{ serviceSlug: service.slug }} values={values} />
                )}
                {takesOrders && step.category.id === "need" && (
                  <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    {t("catalogLater")}
                  </p>
                )}
              </>
            )}

            {step.kind === "summary" && (
              <div className="divide-y divide-border">
                <SummarySection title={PLAN_STEP.title} onEdit={() => goToStep(0)}>
                  <SummaryRow label={t("summary.solution")}>{service.name}</SummaryRow>
                  <SummaryRow label={t("summary.name")}>{name.trim()}</SummaryRow>
                  {service.tier && (
                    <SummaryRow label={t("summary.volume")}>
                      {t.rich("summary.perMonth", {
                        units: price.usageUnits(chosenUnits, service.tier.unit),
                        volume: (chunks) => <span className="font-mono tabular-nums">{chunks}</span>,
                      })}
                    </SummaryRow>
                  )}
                </SummarySection>

                {/* Une catégorie laissée vide n'est pas rappelée : le stepper
                    permet toujours d'y revenir. */}
                {categories.map((category, index) => {
                  const filled = category.fields.filter((field) => !isFieldEmpty(field, values));
                  if (filled.length === 0) return null;
                  return (
                    <SummarySection
                      key={category.id}
                      title={category.title}
                      onEdit={() => goToStep(index + 1)}
                    >
                      {filled.map((field) => (
                        <SummaryRow key={field.key} label={field.label}>
                          {formatConfigField(field, field.key, values[field.key])}
                        </SummaryRow>
                      ))}
                    </SummarySection>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {step.kind === "summary" && (
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-foreground">{t("payment.title")}</h2>
              <CardDescription>{t("payment.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="space-y-2 text-sm">
                {monthlyPriceCents !== null && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{t("payment.subscription")}</dt>
                    <dd>
                      <MonthlyPrice cents={monthlyPriceCents} className="text-right" />
                    </dd>
                  </div>
                )}
                {service.usageCap && (
                  <p className="text-xs text-muted-foreground">
                    {price.usageCap(service.usageCap)}
                  </p>
                )}
              </dl>

              <div className="space-y-2 border-t border-border pt-5">
                <Label htmlFor={promoFieldId}>
                  {t("payment.promoLabel")}{" "}
                  <span className="font-normal text-muted-foreground">{t("payment.optional")}</span>
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
                    {promo.status === "checking" ? t("payment.checking") : t("payment.apply")}
                  </Button>
                </div>
                <div id={promoMessageId} aria-live="polite">
                  {promo.status === "applied" && (
                    <p className="flex items-start gap-1.5 text-sm text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>
                        {t.rich("payment.promoApplied", {
                          description: promo.preview.description,
                          discounted: () => (
                            <span className="font-medium tabular-nums">
                              {price.withVat(promo.preview.discountedFirstPaymentCents)}
                            </span>
                          ),
                          original: () => (
                            <span className="text-muted-foreground tabular-nums line-through">
                              {formatCents(promo.preview.firstPaymentCents)}
                            </span>
                          ),
                        })}
                      </span>
                    </p>
                  )}
                  {promo.status === "error" && <p className="text-sm text-destructive">{promo.reason}</p>}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {t.rich("payment.terms", {
                  link: (chunks) => (
                    <Link href="/terms" target="_blank" className="underline underline-offset-4 hover:text-foreground">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          {stepIndex === 0 ? (
            <Link href="/dashboard/services/catalog" className={buttonVariants({ variant: "outline" })}>
              {tCommon("cancel")}
            </Link>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => goToStep(stepIndex - 1)}
              disabled={isPending}
            >
              <ArrowLeft aria-hidden="true" data-icon="inline-start" />
              {tCommon("back")}
            </Button>
          )}

          {step.kind === "summary" ? (
            <Button type="button" onClick={handlePay} disabled={isPending} aria-busy={isPending}>
              {isPending
                ? t("payment.redirecting")
                : t("payment.pay", { amount: formatPrice(monthlyPriceCents) })}
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {!isLastBeforeSummary && (
                <Button type="button" variant="ghost" onClick={handleSkipToSummary}>
                  {t("skipToSummary")}
                </Button>
              )}
              <Button type="button" onClick={handleContinue}>
                {isLastBeforeSummary ? t("toSummary") : tCommon("continue")}
                <ArrowRight aria-hidden="true" data-icon="inline-end" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type Draft = {
  name: string;
  values: Configuration;
  chosenUnits: number | null;
  stepIndex: number;
  savedAt: number;
};

const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Le stockage du navigateur peut être indisponible (navigation privée,
// données bloquées) : le brouillon est alors simplement ignoré.
function readDraft(key: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (
      typeof draft.name !== "string" ||
      typeof draft.values !== "object" ||
      Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: Omit<Draft, "savedAt">) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Stockage plein ou bloqué : pas de brouillon, le parcours continue.
  }
}

function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Rien à effacer.
  }
}

function SummarySection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("Dashboard.activation.summary");
  return (
    <section className="py-4 first:pt-0 last:pb-0">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          <Pencil aria-hidden="true" data-icon="inline-start" />
          {t("edit")}
          <span className="sr-only">{t("editSection", { title })}</span>
        </Button>
      </div>
      <dl className="text-sm">{children}</dl>
    </section>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words text-foreground">{children}</dd>
    </div>
  );
}
