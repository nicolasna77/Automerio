"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { unwrap } from "@/lib/action-result";
import {
  findMissingRequiredField,
  isFieldVisible,
  PRODUCT_CATALOG_FIELD_KEY,
  type ConfigField,
  type Configuration,
} from "@/lib/catalog";
import { getErrorMessage } from "@/lib/utils";
import { updateServiceConfiguration } from "@/app/dashboard/actions";
import { ConfigFieldsForm } from "@/app/dashboard/config-fields";
import { ProductCatalogEditor } from "@/app/dashboard/product-catalog-editor";
import { readProductCatalog, type CatalogSection } from "@/lib/product-catalog";

export function ServiceConfigurationForm({
  clientServiceId,
  configFields,
  initialConfiguration,
  backHref,
}: {
  clientServiceId: string;
  configFields: ConfigField[];
  initialConfiguration: Configuration;
  backHref: string;
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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const isDirty = useMemo(() => JSON.stringify(values) !== savedSnapshot, [values, savedSnapshot]);

  const catalogField = configFields.find((field) => field.key === PRODUCT_CATALOG_FIELD_KEY);
  const showCatalog = catalogField !== undefined && isFieldVisible(catalogField, values);
  const hasOtherFields = configFields.some((field) => field.key !== PRODUCT_CATALOG_FIELD_KEY);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function setValue(key: string, value: Configuration[string]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const missing = findMissingRequiredField(configFields, values);
    if (missing) {
      setSubmitAttempted(true);
      toast.error(`Le champ « ${missing.label} » est requis.`);
      document.getElementById(missing.key)?.focus();
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

    startSaving(async () => {
      try {
        unwrap(await updateServiceConfiguration(clientServiceId, values));
        setSavedSnapshot(JSON.stringify(values));
        toast.success("Modifications enregistrées.");
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="mt-8 space-y-6">
      {hasOtherFields && (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-base">Réglages</CardTitle>
            <CardDescription>
              Ce que l&apos;assistant doit savoir de votre activité pour répondre à vos clients.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfigFieldsForm
              fields={configFields}
              values={values}
              onChange={setValue}
              submitAttempted={submitAttempted}
              omitKeys={[PRODUCT_CATALOG_FIELD_KEY]}
            />
          </CardContent>
        </Card>
      )}

      {showCatalog && (
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
      )}

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-background px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          <p role="status" className="mr-auto text-sm text-muted-foreground">
            {isDirty ? "Modifications non enregistrées" : ""}
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
            {isSaving ? "Enregistrement…" : "Enregistrer les modifications"}
          </Button>
        </div>
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
