"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, FileUp, Loader2, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { unwrap } from "@/lib/action-result";
import { MENU_IMPORT_MAX_FILES } from "@/lib/menu-import";
import {
  countCatalogItems,
  describeProductCatalog,
  emptyCatalogItem,
  emptyCatalogSection,
  formatPriceInput,
  parsePriceInput,
  type CatalogItem,
  type CatalogSection,
} from "@/lib/product-catalog";
import { cn, getErrorMessage } from "@/lib/utils";
import { transcribeMenu } from "./menu-import-actions";

const MAX_IMAGE_EDGE_PX = 2000;

const QUIET_FIELD =
  "border-transparent bg-transparent shadow-none placeholder:text-muted-foreground/60 hover:bg-muted/60 focus-visible:bg-input/50";

async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function productCount(count: number): string {
  return `${count} produit${count > 1 ? "s" : ""}`;
}

type Status = { tone: "info" | "error"; message: string } | null;

export function ProductCatalogEditor({
  value,
  onChange,
}: {
  value: CatalogSection[];
  onChange: (sections: CatalogSection[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const [isImporting, startImport] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const [imported, setImported] = useState<CatalogSection[] | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sectionToDelete, setSectionToDelete] = useState<CatalogSection | null>(null);
  const pendingFocusId = useRef<string | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!pendingFocusId.current) return;
    document.getElementById(pendingFocusId.current)?.focus();
    pendingFocusId.current = null;
  });

  const itemCount = countCatalogItems(value);

  function applyImport(sections: CatalogSection[], mode: "replace" | "append") {
    const next = mode === "replace" ? sections : [...valueRef.current, ...sections];
    onChange(next);
    setCollapsed(new Set());
    setImported(null);
    setStatus({
      tone: "info",
      message: `${productCount(countCatalogItems(sections))} importés. Relisez les noms et les prix, puis enregistrez.`,
    });
  }

  function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;
    if (files.length > MENU_IMPORT_MAX_FILES) {
      setStatus({ tone: "error", message: `${MENU_IMPORT_MAX_FILES} fichiers maximum par import.` });
      return;
    }

    setStatus({ tone: "info", message: "Lecture de votre carte en cours, cela prend en général moins d'une minute." });
    startImport(async () => {
      try {
        const formData = new FormData();
        for (const file of await Promise.all(files.map(shrinkImage))) {
          formData.append("files", file);
        }
        const sections = unwrap(await transcribeMenu(formData));
        if (countCatalogItems(valueRef.current) === 0) {
          applyImport(sections, "replace");
        } else {
          setStatus(null);
          setImported(sections);
        }
      } catch (err) {
        setStatus({ tone: "error", message: getErrorMessage(err) });
      }
    });
  }

  function updateSection(sectionId: string, patch: Partial<CatalogSection>) {
    onChange(value.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)));
  }

  function updateItem(sectionId: string, itemId: string, patch: Partial<CatalogItem>) {
    onChange(
      value.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
            }
          : section
      )
    );
  }

  function addItem(sectionId: string) {
    const item = emptyCatalogItem();
    onChange(
      value.map((section) =>
        section.id === sectionId ? { ...section, items: [...section.items, item] } : section
      )
    );
    pendingFocusId.current = `catalog-${item.id}-name`;
  }

  function removeItem(sectionId: string, itemId: string) {
    onChange(
      value.map((section) =>
        section.id === sectionId
          ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
          : section
      )
    );
  }

  function addSection() {
    const section = emptyCatalogSection();
    onChange([...value, section]);
    pendingFocusId.current = `catalog-${section.id}-title`;
  }

  function requestRemoveSection(section: CatalogSection) {
    if (section.items.some((item) => item.name.trim())) {
      setSectionToDelete(section);
    } else {
      onChange(value.filter((s) => s.id !== section.id));
    }
  }

  function toggleSection(sectionId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  const importButton = (variant: "default" | "outline") => (
    <Button
      type="button"
      variant={variant}
      size={variant === "default" ? "default" : "sm"}
      disabled={isImporting}
      aria-busy={isImporting}
      onClick={() => inputRef.current?.click()}
    >
      {isImporting ? (
        <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />
      ) : (
        <FileUp aria-hidden="true" data-icon="inline-start" />
      )}
      Importer une photo ou un PDF
    </Button>
  );

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {value.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{describeProductCatalog(value)}</p>
          {importButton("outline")}
        </div>
      )}

      <p
        role="status"
        className={cn(
          "text-sm empty:hidden",
          status?.tone === "error" ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {status?.message}
      </p>

      {isImporting && (
        <div aria-hidden="true" className="space-y-3 rounded-3xl border border-border p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-4/5" />
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && !isImporting && (
        <div className="rounded-3xl border border-dashed border-border px-6 py-8 text-center">
          <p className="font-medium text-foreground">Ajoutez les produits que l&apos;assistant peut vendre</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Envoyez une photo ou un PDF de votre carte : les produits, leur composition et leurs
            prix sont recopiés ici, prêts à être relus.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {importButton("default")}
            <Button type="button" variant="outline" onClick={addSection} disabled={isImporting}>
              Saisir à la main
            </Button>
          </div>
        </div>
      )}

      {value.map((section) => {
        const isCollapsed = collapsed.has(section.id);
        const listId = `catalog-${section.id}-items`;
        const sectionName = section.title.trim() || "sans titre";
        return (
          <section key={section.id} className="rounded-3xl border border-border">
            <div className="flex items-center gap-1 py-2 pr-2 pl-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-expanded={!isCollapsed}
                aria-controls={listId}
                aria-label={`${isCollapsed ? "Déplier" : "Replier"} la rubrique ${sectionName}`}
                onClick={() => toggleSection(section.id)}
              >
                <ChevronDown
                  aria-hidden="true"
                  className={cn("transition-transform", isCollapsed && "-rotate-90")}
                />
              </Button>
              <Input
                id={`catalog-${section.id}-title`}
                value={section.title}
                onChange={(e) => updateSection(section.id, { title: e.target.value })}
                placeholder="Nom de la rubrique, par exemple Pizzas"
                aria-label="Nom de la rubrique"
                className={cn(QUIET_FIELD, "min-w-0 flex-1 px-2 text-base font-semibold")}
              />
              <span className="shrink-0 px-1 text-sm text-muted-foreground tabular-nums">
                {productCount(section.items.length)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Supprimer la rubrique ${sectionName}`}
                onClick={() => requestRemoveSection(section)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>

            <div id={listId} hidden={isCollapsed}>
              <ul className="divide-y divide-border border-t border-border">
                {section.items.map((item) => (
                  <CatalogItemRow
                    key={item.id}
                    item={item}
                    onChange={(patch) => updateItem(section.id, item.id, patch)}
                    onRemove={() => removeItem(section.id, item.id)}
                  />
                ))}
              </ul>
              <div className="border-t border-border px-2 py-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => addItem(section.id)}>
                  <Plus aria-hidden="true" data-icon="inline-start" />
                  Ajouter un produit
                </Button>
              </div>
            </div>
          </section>
        );
      })}

      {value.length > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={addSection}>
          <Plus aria-hidden="true" data-icon="inline-start" />
          Ajouter une rubrique
        </Button>
      )}

      <AlertDialog open={imported !== null} onOpenChange={(open) => !open && setImported(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {productCount(countCatalogItems(imported ?? []))} trouvés dans votre document
            </AlertDialogTitle>
            <AlertDialogDescription>
              Votre carte contient déjà {productCount(itemCount)}. Remplacez-la par la carte
              importée, ou ajoutez ces produits à la suite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="outline" onClick={() => imported && applyImport(imported, "append")}>
              Ajouter à la suite
            </AlertDialogAction>
            <AlertDialogAction onClick={() => imported && applyImport(imported, "replace")}>
              Remplacer la carte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={sectionToDelete !== null}
        onOpenChange={(open) => !open && setSectionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer la rubrique {sectionToDelete?.title.trim() || "sans titre"} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ses {productCount(sectionToDelete?.items.length ?? 0)} seront retirés de la carte. Rien
              n&apos;est définitif tant que vous n&apos;avez pas enregistré.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (sectionToDelete) onChange(value.filter((s) => s.id !== sectionToDelete.id));
                setSectionToDelete(null);
              }}
            >
              Supprimer la rubrique
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CatalogItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: CatalogItem;
  onChange: (patch: Partial<CatalogItem>) => void;
  onRemove: () => void;
}) {
  const [priceText, setPriceText] = useState(() => formatPriceInput(item.priceCents));
  const priceInvalid = priceText.trim() !== "" && parsePriceInput(priceText) === null;
  const productName = item.name.trim() || "sans nom";

  return (
    <li className="space-y-1 px-2 py-2.5">
      <div className="flex items-start gap-1">
        <Input
          id={`catalog-${item.id}-name`}
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nom du produit"
          aria-label="Nom du produit"
          className={cn(QUIET_FIELD, "min-w-0 flex-1 px-2 font-medium")}
        />
        <div className="relative w-22 shrink-0 sm:w-28">
          <Input
            value={priceText}
            onChange={(e) => {
              const next = e.target.value;
              setPriceText(next);
              const cents = parsePriceInput(next);
              if (next.trim() === "" || cents !== null) {
                onChange({ priceCents: next.trim() === "" ? null : cents });
              }
            }}
            onBlur={() => {
              if (!priceInvalid) setPriceText(formatPriceInput(parsePriceInput(priceText)));
            }}
            inputMode="decimal"
            placeholder="Prix"
            aria-label={`Prix de ${productName}, en euros`}
            aria-invalid={priceInvalid}
            className={cn(QUIET_FIELD, "pr-7 text-right font-medium tabular-nums")}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground"
          >
            €
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="mt-0.5 text-muted-foreground"
          aria-label={`Retirer ${productName}`}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      <div className="flex flex-col gap-1 pr-9 sm:flex-row">
        <Textarea
          value={item.details}
          onChange={(e) => onChange({ details: e.target.value })}
          placeholder="Composition ou description"
          aria-label={`Composition de ${productName}`}
          rows={1}
          className={cn(QUIET_FIELD, "min-h-9 flex-1 px-2 py-2 text-sm text-muted-foreground")}
        />
        <Input
          value={item.note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Précision"
          aria-label={`Précision sur ${productName}`}
          className={cn(QUIET_FIELD, "px-2 text-sm sm:w-44")}
        />
      </div>
      {priceInvalid && (
        <p className="px-2 text-xs text-destructive">
          Prix non reconnu : saisissez un montant comme 9,90.
        </p>
      )}
    </li>
  );
}
