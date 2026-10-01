"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { BadgeInfo, Check, CreditCard, Loader2, Plug, UtensilsCrossed, type LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unwrap } from "@/lib/action-result";
import {
  findInvalidWeeklyHours,
  findMissingRequiredField,
  isFieldVisible,
  PRODUCT_CATALOG_FIELD_KEY,
  type ConfigField,
  type Configuration,
} from "@/lib/catalog";
import { cn, getErrorMessage } from "@/lib/utils";
import { updateServiceConfiguration } from "@/app/[locale]/dashboard/actions";
import { ConfigFieldsForm } from "@/app/[locale]/dashboard/config-fields";
import { VoicePreview } from "@/app/[locale]/dashboard/voice-preview";
import { buildFieldCategories } from "@/app/[locale]/dashboard/field-categories";
import { BILLING_SECTION_ID, CONNECTORS_SECTION_ID } from "@/app/[locale]/dashboard/billing-section";
import { ProductCatalogEditor } from "@/app/[locale]/dashboard/product-catalog-editor";
import { readProductCatalog, type CatalogSection } from "@/lib/product-catalog";

type Section = { id: string; title: string; icon: LucideIcon; keys: string[] };

// Onglet « Vos informations » : le nom de la solution, enregistré avec les
// autres réglages par le même bouton.
const IDENTITY_SECTION_ID = "reglages-informations";

export function ServiceConfigurationForm({
  clientServiceId,
  initialName,
  configFields,
  initialConfiguration,
  backHref,
  companyName,
  billingSection = null,
  connectorsSection = null,
}: {
  clientServiceId: string;
  initialName: string;
  configFields: ConfigField[];
  initialConfiguration: Configuration;
  backHref: string;
  companyName: string;
  // Section « Abonnement » (volume, moyen de paiement), hors du bouton Enregistrer.
  billingSection?: React.ReactNode;
  // Section « Connecteurs » (agenda), elle aussi hors du bouton Enregistrer.
  connectorsSection?: React.ReactNode;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [values, setValues] = useState<Configuration>(() =>
    configFields.some((field) => field.key === PRODUCT_CATALOG_FIELD_KEY)
      ? {
          ...initialConfiguration,
          [PRODUCT_CATALOG_FIELD_KEY]: readProductCatalog(initialConfiguration[PRODUCT_CATALOG_FIELD_KEY]),
        }
      : initialConfiguration
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(values));
  const nameFieldId = useId();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const nameDirty = name.trim() !== savedName;
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(values) !== savedSnapshot || nameDirty,
    [values, savedSnapshot, nameDirty]
  );

  const catalogField = configFields.find((field) => field.key === PRODUCT_CATALOG_FIELD_KEY);
  const showCatalog = catalogField !== undefined && isFieldVisible(catalogField, values);
  const categories = buildFieldCategories(configFields, values, [PRODUCT_CATALOG_FIELD_KEY]);

  // Lien direct vers un onglet (« Ajuster l'abonnement » depuis la page de la
  // solution) : l'ancre de l'adresse choisit l'onglet ouvert.
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    const target = window.location.hash.slice(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'ancre n'existe que dans le navigateur
    if (target) setActiveId(target);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function setValue(key: string, value: Configuration[string]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // Ouvre l'onglet qui contient le champ, puis agit dessus une fois affiché.
  function revealField(key: string, then: () => void) {
    const section = categories.find((category) => category.fields.some((field) => field.key === key));
    if (section) selectTab(`reglages-${section.id}`);
    requestAnimationFrame(then);
  }

  function handleSave() {
    if (!name.trim()) {
      setSubmitAttempted(true);
      toast.error("Renseignez « Nom de la solution » pour enregistrer.");
      selectTab(IDENTITY_SECTION_ID);
      requestAnimationFrame(() => document.getElementById(nameFieldId)?.focus());
      return;
    }
    const badHours = findInvalidWeeklyHours(configFields, values);
    if (badHours) {
      toast.error(`« ${badHours.label} » : une heure de fermeture vient avant l'ouverture.`);
      revealField(badHours.key, () =>
        document.getElementById(badHours.key)?.scrollIntoView({ block: "center" })
      );
      return;
    }
    const missing = findMissingRequiredField(configFields, values);
    if (missing) {
      setSubmitAttempted(true);
      toast.error(`Renseignez « ${missing.label} » pour enregistrer.`);
      revealField(missing.key, () => document.getElementById(missing.key)?.focus());
      return;
    }
    const unnamedItem = ((values[PRODUCT_CATALOG_FIELD_KEY] as CatalogSection[] | undefined) ?? [])
      .flatMap((section) => section.items)
      .find((item) => !item.name.trim() && (item.details.trim() || item.note.trim() || item.priceCents !== null));
    if (unnamedItem) {
      toast.error("Un produit de la carte n'a pas de nom.");
      document.getElementById(`catalog-${unnamedItem.id}-name`)?.focus();
      return;
    }

    // Le nom n'est envoyé que s'il a changé : un ancien nom n'est jamais
    // retouché par l'enregistrement d'un autre réglage. Une saisie faite
    // pendant l'enregistrement n'est pas écrasée.
    const submittedName = name.trim();
    startSaving(async () => {
      try {
        unwrap(
          await updateServiceConfiguration(clientServiceId, values, nameDirty ? submittedName : undefined)
        );
        setSavedSnapshot(JSON.stringify(values));
        setSavedName(submittedName);
        setSavedAt(
          new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date())
        );
        toast.success("Modifications enregistrées.");
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  const sections: Section[] = [
    { id: IDENTITY_SECTION_ID, title: "Vos informations", icon: BadgeInfo, keys: [] },
    ...categories.map((category) => ({
      id: `reglages-${category.id}`,
      title: category.title,
      icon: category.icon,
      keys: category.fields.map((field) => field.key),
    })),
    ...(showCatalog
      ? [{ id: "reglages-carte", title: "Carte et produits", icon: UtensilsCrossed, keys: [PRODUCT_CATALOG_FIELD_KEY] }]
      : []),
    ...(connectorsSection ? [{ id: CONNECTORS_SECTION_ID, title: "Connecteurs", icon: Plug, keys: [] }] : []),
    ...(billingSection ? [{ id: BILLING_SECTION_ID, title: "Abonnement", icon: CreditCard, keys: [] }] : []),
  ];
  const current = sections.find((section) => section.id === activeId) ?? sections[0];

  // Onglets modifiés depuis le dernier enregistrement, signalés par un point.
  const saved = JSON.parse(savedSnapshot) as Configuration;
  const isSectionDirty = (section: Section) =>
    section.id === IDENTITY_SECTION_ID
      ? nameDirty
      : section.keys.some((key) => JSON.stringify(values[key]) !== JSON.stringify(saved[key]));

  function selectTab(id: string, focusTab = false) {
    setActiveId(id);
    window.history.replaceState(null, "", `#${id}`);
    if (!focusTab) return;
    // Deux jeux d'onglets (ordinateur, mobile) : on vise celui qui est affiché.
    requestAnimationFrame(() => {
      const desktop = document.getElementById(`${id}-tab`);
      (desktop?.offsetParent ? desktop : document.getElementById(`${id}-tab-mobile`))?.focus();
    });
  }

  // Flèches du clavier entre les onglets, comme le veut le motif « tablist ».
  function handleTabKey(event: React.KeyboardEvent, index: number) {
    const last = sections.length - 1;
    const next =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? index === last ? 0 : index + 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? index === 0 ? last : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    selectTab(sections[next].id, true);
  }

  const tabs = (orientation: "vertical" | "horizontal") => (
    <div
      role="tablist"
      aria-label="Catégories de réglages"
      aria-orientation={orientation}
      className={cn(
        orientation === "vertical"
          ? "hidden space-y-0.5 lg:sticky lg:top-24 lg:block"
          : "-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:-mx-6 sm:px-6 lg:hidden"
      )}
    >
      {sections.map((section, index) => {
        const selected = section.id === current?.id;
        const dirty = isSectionDirty(section);
        return (
          <button
            key={section.id}
            id={orientation === "vertical" ? `${section.id}-tab` : `${section.id}-tab-mobile`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${section.id}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => selectTab(section.id)}
            onKeyDown={(event) => handleTabKey(event, index)}
            className={cn(
              "flex shrink-0 items-center gap-2.5 text-sm transition-colors focus-visible:focus-ring focus-visible:outline-none",
              orientation === "vertical"
                ? "w-full rounded-lg px-3 py-2 text-left"
                : "-mb-px h-11 border-b-2 px-2 whitespace-nowrap",
              orientation === "vertical" &&
                (selected
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"),
              orientation === "horizontal" &&
                (selected
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")
            )}
          >
            <section.icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{section.title}</span>
            {dirty && (
              <span className="size-1.5 shrink-0 rounded-full bg-attention" aria-label="modifié" role="img" />
            )}
          </button>
        );
      })}
    </div>
  );

  const panelClass = (id: string) => (id === current?.id ? "" : "hidden");

  return (
    <div className="mt-8 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      {sections.length > 1 && tabs("vertical")}

      <div className="min-w-0 lg:col-start-2">
        {sections.length > 1 && tabs("horizontal")}

        <div
          id={`${IDENTITY_SECTION_ID}-panel`}
          role="tabpanel"
          aria-labelledby={`${IDENTITY_SECTION_ID}-tab`}
          className={panelClass(IDENTITY_SECTION_ID)}
        >
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BadgeInfo className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <CardTitle as="h2" className="text-base">Vos informations</CardTitle>
                  <CardDescription>Le nom de cette solution dans votre tableau de bord.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor={nameFieldId}>Nom de la solution</Label>
              <Input
                id={nameFieldId}
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={submitAttempted && !name.trim()}
                aria-describedby={`${nameFieldId}-help`}
              />
              <p id={`${nameFieldId}-help`} className="text-xs text-muted-foreground">
                Utile si vous activez la même solution plusieurs fois, pour plusieurs boutiques par exemple.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tous les onglets restent montés : les saisies en cours sont gardées,
            et un champ en erreur dans un autre onglet reste atteignable. */}
        {categories.map((category) => (
          <div
            key={category.id}
            id={`reglages-${category.id}-panel`}
            role="tabpanel"
            aria-labelledby={`reglages-${category.id}-tab`}
            className={panelClass(`reglages-${category.id}`)}
          >
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <category.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle as="h2" className="text-base">{category.title}</CardTitle>
                    {category.description && <CardDescription>{category.description}</CardDescription>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ConfigFieldsForm
                  fields={category.fields}
                  values={values}
                  onChange={setValue}
                  submitAttempted={submitAttempted}
                  companyName={companyName}
                />
                {category.id === "voice" && <VoicePreview clientServiceId={clientServiceId} values={values} />}
              </CardContent>
            </Card>
          </div>
        ))}

        {showCatalog && (
          <div
            id="reglages-carte-panel"
            role="tabpanel"
            aria-labelledby="reglages-carte-tab"
            className={panelClass("reglages-carte")}
          >
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="text-base">Carte et produits</CardTitle>
                <CardDescription>
                  Les produits et les prix que l&apos;assistant propose quand il prend une commande.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductCatalogEditor
                  value={(values[PRODUCT_CATALOG_FIELD_KEY] as CatalogSection[] | undefined) ?? []}
                  onChange={(sections) => setValue(PRODUCT_CATALOG_FIELD_KEY, sections)}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {connectorsSection && (
          <div
            id={`${CONNECTORS_SECTION_ID}-panel`}
            role="tabpanel"
            aria-labelledby={`${CONNECTORS_SECTION_ID}-tab`}
            className={panelClass(CONNECTORS_SECTION_ID)}
          >
            {connectorsSection}
          </div>
        )}

        {billingSection && (
          <div
            id={`${BILLING_SECTION_ID}-panel`}
            role="tabpanel"
            aria-labelledby={`${BILLING_SECTION_ID}-tab`}
            className={panelClass(BILLING_SECTION_ID)}
          >
            {billingSection}
          </div>
        )}

        {/* Sur les onglets Abonnement et Connecteurs, dont les actions
            s'appliquent tout de suite, la barre n'apparaît que s'il reste des
            changements ailleurs. */}
        {((current?.id !== BILLING_SECTION_ID && current?.id !== CONNECTORS_SECTION_ID) || isDirty) && (
          <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-t-lg lg:border-x">
            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
              <p role="status" className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
                {isDirty ? (
                  <>
                    <span aria-hidden="true" className="size-2 rounded-full bg-attention" />
                    Modifications non enregistrées
                  </>
                ) : savedAt ? (
                  <>
                    <Check className="size-4 text-primary" aria-hidden="true" />
                    Enregistré à {savedAt}
                  </>
                ) : null}
              </p>
              {isDirty ? (
                <Button type="button" variant="outline" onClick={() => setConfirmLeave(true)} disabled={isSaving}>
                  Annuler
                </Button>
              ) : (
                <Button variant="outline" nativeButton={false} render={<Link href={backHref} />}>
                  Retour à la solution
                </Button>
              )}
              <Button type="button" onClick={handleSave} disabled={!isDirty || isSaving} aria-busy={isSaving}>
                {isSaving && <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />}
                {isSaving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonner vos modifications ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les changements faits depuis le dernier enregistrement seront perdus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer à modifier</AlertDialogCancel>
            <Button variant="destructive" nativeButton={false} render={<Link href={backHref} />}>
              Abandonner
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
