"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
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
  type DiscountDuration,
  type PromoCodeFormInput,
} from "@/lib/promo-codes";
import { createPromoCodeAction } from "./actions";

const KIND_LABELS = { percent: "Pourcentage", amount: "Montant fixe" } as const;
type Kind = keyof typeof KIND_LABELS;

const DURATION_LABELS: Record<DiscountDuration, string> = {
  once: "Premier paiement seulement",
  repeating: "Plusieurs mois",
  forever: "Toute la durée de l'abonnement",
};

export function PromoCodeCreateDialog({
  services,
}: {
  services: { slug: string; name: string }[];
}) {
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
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [kind, setKind] = useState<Kind>("percent");
  const [value, setValue] = useState("");
  const [duration, setDuration] = useState<DiscountDuration>("once");
  const [months, setMonths] = useState("3");
  const [expiresOn, setExpiresOn] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [firstTimeOnly, setFirstTimeOnly] = useState(false);
  const [slugs, setSlugs] = useState<string[]>([]);

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
    setError(null);
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
    setError(null);
    setPending(true);

    const input: PromoCodeFormInput = {
      code,
      ...discountFields,
      expiresAtMs: expiresOn ? new Date(`${expiresOn}T23:59:59`).getTime() : null,
      maxRedemptions: maxUses.trim() ? Number(maxUses) : null,
      firstTimeOnly,
      serviceSlugs: slugs,
    };

    try {
      const result = await createPromoCodeAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Code « ${result.code} » créé.`);
      reset();
      setOpen(false);
    } catch {
      setError("La création a échoué. Vérifiez votre connexion puis réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Créer un code
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
              <DialogTitle>Créer un code promo</DialogTitle>
              <DialogDescription>
                Vos clients le saisissent en activant une solution.
              </DialogDescription>
            </DialogHeader>

            <div className="-mr-1 mt-4 max-h-[65vh] space-y-5 overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label htmlFor={ids.code}>Code</Label>
                <Input
                  id={ids.code}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="BIENVENUE20"
                  autoComplete="off"
                  spellCheck={false}
                  className="uppercase"
                  aria-describedby={ids.codeHelp}
                  required
                />
                <p id={ids.codeHelp} className="text-xs text-muted-foreground">
                  Lettres, chiffres et tirets. Vos clients peuvent le taper en
                  minuscules.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <div className="space-y-2">
                  <Label htmlFor={ids.kind}>Remise</Label>
                  <Select
                    value={kind}
                    onValueChange={(next) => setKind(next as Kind)}
                    items={KIND_LABELS}
                  >
                    <SelectTrigger id={ids.kind} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={ids.value}>{kind === "percent" ? "En %" : "En €"}</Label>
                  <Input
                    id={ids.value}
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={kind === "percent" ? "20" : "50"}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <div className="space-y-2">
                  <Label htmlFor={ids.duration}>S&apos;applique à</Label>
                  <Select
                    value={duration}
                    onValueChange={(next) => setDuration(next as DiscountDuration)}
                    items={DURATION_LABELS}
                  >
                    <SelectTrigger id={ids.duration} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DURATION_LABELS) as DiscountDuration[]).map((d) => (
                        <SelectItem key={d} value={d}>
                          {DURATION_LABELS[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {duration === "repeating" && (
                  <div className="space-y-2">
                    <Label htmlFor={ids.months}>Mois</Label>
                    <Input
                      id={ids.months}
                      inputMode="numeric"
                      value={months}
                      onChange={(e) => setMonths(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              <div aria-live="polite" className="rounded-2xl bg-muted/50 p-3 text-sm">
                {preview === null ? (
                  <span className="text-muted-foreground">
                    Indiquez une remise pour voir ce que vos clients liront.
                  </span>
                ) : preview.ok ? (
                  <span>
                    <span className="text-muted-foreground">Vos clients liront : </span>
                    {describeDiscount(preview.rule)}.
                  </span>
                ) : (
                  <span className="text-destructive">{preview.error}</span>
                )}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Solutions concernées</legend>
                <p className="text-xs text-muted-foreground">
                  Aucune cochée : le code vaut pour toutes.
                </p>
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
                  Réservé aux nouveaux clients
                  <span className="block text-xs text-muted-foreground">
                    Refusé à un client qui a déjà payé une solution.
                  </span>
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={ids.expires}>
                    Expire le <span className="font-normal text-muted-foreground">(facultatif)</span>
                  </Label>
                  <Input
                    id={ids.expires}
                    type="date"
                    value={expiresOn}
                    onChange={(e) => setExpiresOn(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={ids.maxUses}>
                    Utilisations max.{" "}
                    <span className="font-normal text-muted-foreground">(facultatif)</span>
                  </Label>
                  <Input
                    id={ids.maxUses}
                    inputMode="numeric"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Création…" : "Créer le code"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
