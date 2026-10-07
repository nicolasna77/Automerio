"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  describeDiscount,
  parseDiscountRule,
  parsePromoCodeInput,
  type DiscountDuration,
  type PromoCodeField,
  type PromoCodeFormInput,
} from "@/lib/promo-codes";
import { createPromoCodeAction } from "./actions";

const KINDS = ["percent", "amount"] as const;
type Kind = (typeof KINDS)[number];

const DURATIONS: DiscountDuration[] = ["once", "repeating", "forever"];

// Même contrôle que le serveur, pour signaler l'erreur sous le champ concerné.
function checkInput(input: PromoCodeFormInput) {
  return parsePromoCodeInput(input, Date.now());
}

export function PromoCodeCreateDialog({
  services,
}: {
  services: { slug: string; name: string }[];
}) {
  const t = useTranslations("Admin.promoCodes");
  const tCommon = useTranslations("Common");
  const tActions = useTranslations("Actions");
  const ids = {
    code: useId(),
    codeHelp: useId(),
    kind: useId(),
    value: useId(),
    duration: useId(),
    months: useId(),
    expires: useId(),
    maxUses: useId(),
  };
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  // Erreur de saisie affichée sous le champ concerné, qui reçoit le focus.
  const [fieldError, setFieldError] = useState<{ field: PromoCodeField; message: string } | null>(
    null
  );

  const [code, setCode] = useState("");
  const [kind, setKind] = useState<Kind>("percent");
  const [value, setValue] = useState("");
  const [duration, setDuration] = useState<DiscountDuration>("once");
  const [months, setMonths] = useState("3");
  const [expiresOn, setExpiresOn] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [firstTimeOnly, setFirstTimeOnly] = useState(false);
  const [slugs, setSlugs] = useState<string[]>([]);

  const kindLabels: Record<Kind, string> = {
    percent: t("kinds.percent"),
    amount: t("kinds.amount"),
  };
  const durationLabels: Record<DiscountDuration, string> = {
    once: t("durations.once"),
    repeating: t("durations.repeating"),
    forever: t("durations.forever"),
  };

  function reset() {
    setCode("");
    setKind("percent");
    setValue("");
    setDuration("once");
    setMonths("3");
    setExpiresOn("");
    setMaxUses("");
    setFirstTimeOnly(false);
    setSlugs([]);
    setFieldError(null);
  }

  function clearFieldError(field: PromoCodeField) {
    setFieldError((current) => (current?.field === field ? null : current));
  }

  // aria-invalid et aria-describedby d'un champ qui peut porter une erreur.
  function errorProps(field: PromoCodeField, hintId?: string) {
    const invalid = fieldError?.field === field;
    const describedBy = [hintId, invalid ? `${ids[field]}-error` : null].filter(Boolean).join(" ");
    return {
      "aria-invalid": invalid || undefined,
      "aria-describedby": describedBy || undefined,
    };
  }

  function errorMessage(field: PromoCodeField) {
    if (fieldError?.field !== field) return null;
    return (
      <p id={`${ids[field]}-error`} className="text-sm text-destructive">
        {fieldError.message}
      </p>
    );
  }

  const discountFields = {
    kind,
    value: Number(value.replace(",", ".")),
    duration,
    durationInMonths: duration === "repeating" ? Number(months) : null,
  };

  const preview = value.trim() ? parseDiscountRule(discountFields) : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const input: PromoCodeFormInput = {
      code,
      ...discountFields,
      expiresAtMs: expiresOn ? new Date(`${expiresOn}T23:59:59`).getTime() : null,
      maxRedemptions: maxUses.trim() ? Number(maxUses) : null,
      firstTimeOnly,
      serviceSlugs: slugs,
    };

    const parsed = checkInput(input);
    if (!parsed.ok) {
      setFieldError({ field: parsed.field, message: tActions(parsed.problem) });
      document.getElementById(ids[parsed.field])?.focus();
      return;
    }

    setPending(true);
    try {
      const { code: created } = unwrap(await createPromoCodeAction(input));
      toast.success(t("created", { code: created }));
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, t("createError")));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        {t("create")}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) reset();
          setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t("createTitle")}</DialogTitle>
              <DialogDescription>{t("createDescription")}</DialogDescription>
            </DialogHeader>

            <div className="-mr-1 mt-4 max-h-[65vh] space-y-5 overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label htmlFor={ids.code}>{t("code")}</Label>
                <Input
                  id={ids.code}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    clearFieldError("code");
                  }}
                  placeholder={t("codePlaceholder")}
                  autoComplete="off"
                  spellCheck={false}
                  className="uppercase"
                  {...errorProps("code", ids.codeHelp)}
                  required
                />
                <p id={ids.codeHelp} className="text-xs text-muted-foreground">
                  {t("codeHelp")}
                </p>
                {errorMessage("code")}
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <div className="space-y-2">
                  <Label htmlFor={ids.kind}>{t("discount")}</Label>
                  <Select
                    value={kind}
                    onValueChange={(next) => {
                      setKind(next as Kind);
                      clearFieldError("value");
                    }}
                    items={kindLabels}
                  >
                    <SelectTrigger id={ids.kind} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {kindLabels[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={ids.value}>
                    {kind === "percent" ? t("inPercent") : t("inEuros")}
                  </Label>
                  <Input
                    id={ids.value}
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      clearFieldError("value");
                    }}
                    placeholder={kind === "percent" ? "20" : "50"}
                    {...errorProps("value")}
                    required
                  />
                  {errorMessage("value")}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <div className="space-y-2">
                  <Label htmlFor={ids.duration}>{t("appliesTo")}</Label>
                  <Select
                    value={duration}
                    onValueChange={(next) => {
                      setDuration(next as DiscountDuration);
                      clearFieldError("months");
                    }}
                    items={durationLabels}
                  >
                    <SelectTrigger id={ids.duration} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {durationLabels[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {duration === "repeating" && (
                  <div className="space-y-2">
                    <Label htmlFor={ids.months}>{t("months")}</Label>
                    <Input
                      id={ids.months}
                      inputMode="numeric"
                      value={months}
                      onChange={(e) => {
                        setMonths(e.target.value);
                        clearFieldError("months");
                      }}
                      {...errorProps("months")}
                      required
                    />
                    {errorMessage("months")}
                  </div>
                )}
              </div>

              <div aria-live="polite" className="rounded-2xl bg-muted/50 p-3 text-sm">
                {preview === null ? (
                  <span className="text-muted-foreground">{t("previewEmpty")}</span>
                ) : preview.ok ? (
                  <span>
                    <span className="text-muted-foreground">{t("previewLabel")}</span>
                    {describeDiscount(preview.rule)}.
                  </span>
                ) : (
                  <span className="text-destructive">{tActions(preview.problem)}</span>
                )}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("servicesLegend")}</legend>
                <p className="text-xs text-muted-foreground">{t("servicesHint")}</p>
                <div className="space-y-1.5 rounded-2xl border border-border p-3">
                  {services.map((service) => (
                    <label key={service.slug} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={slugs.includes(service.slug)}
                        onChange={(e) =>
                          setSlugs((prev) =>
                            e.target.checked
                              ? [...prev, service.slug]
                              : prev.filter((s) => s !== service.slug)
                          )
                        }
                      />
                      {service.name}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={firstTimeOnly}
                  onChange={(e) => setFirstTimeOnly(e.target.checked)}
                />
                <span>
                  {t("firstTimeOnly")}
                  <span className="block text-xs text-muted-foreground">
                    {t("firstTimeOnlyHint")}
                  </span>
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={ids.expires}>
                    {t("expiresOn")}{" "}
                    <span className="font-normal text-muted-foreground">{t("optional")}</span>
                  </Label>
                  <Input
                    id={ids.expires}
                    type="date"
                    value={expiresOn}
                    onChange={(e) => {
                      setExpiresOn(e.target.value);
                      clearFieldError("expires");
                    }}
                    {...errorProps("expires")}
                  />
                  {errorMessage("expires")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={ids.maxUses}>
                    {t("maxUses")}{" "}
                    <span className="font-normal text-muted-foreground">{t("optional")}</span>
                  </Label>
                  <Input
                    id={ids.maxUses}
                    inputMode="numeric"
                    value={maxUses}
                    onChange={(e) => {
                      setMaxUses(e.target.value);
                      clearFieldError("maxUses");
                    }}
                    {...errorProps("maxUses")}
                  />
                  {errorMessage("maxUses")}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? tCommon("creating") : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
