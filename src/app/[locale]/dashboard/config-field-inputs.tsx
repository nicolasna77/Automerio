"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, CalendarDays, Clock, Copy, FileText, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  CALL_TEMPLATES,
  COMMON_CALL_REASONS,
  fillTemplate,
  type CallTemplate,
} from "@/content/fr/call-templates";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  WEEK_DAYS,
  WEEK_DAY_LABELS,
  type RuleRow,
  type WeeklyHours,
} from "@/lib/catalog";

export function DateField({
  id,
  value,
  placeholder,
  hasError,
  onChange,
}: {
  id: string;
  value: string;
  placeholder?: string;
  hasError?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={hasError}
            className="w-full justify-start font-normal"
          >
            <CalendarDays className="text-muted-foreground" data-icon="inline-start" />
            {selected
              ? format(selected, "d MMMM yyyy", { locale: fr })
              : (placeholder ?? "Choisir une date")}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={fr}
          selected={selected}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function TagsField({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: string[];
  placeholder?: string;
  onChange: (value: string[]) => void;
}) {
  function addTag(raw: string) {
    const tag = raw.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
              <button
                type="button"
                data-icon="inline-end"
                aria-label={`Retirer « ${tag} »`}
                onClick={() => onChange(value.filter((t) => t !== tag))}
              >
                <X />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        id={id}
        placeholder={placeholder ?? "Ajouter puis Entrée"}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== ",") return;
          e.preventDefault();
          addTag(e.currentTarget.value);
          e.currentTarget.value = "";
        }}
        onBlur={(e) => {
          addTag(e.currentTarget.value);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}

export function MultiselectField({
  id,
  options,
  value,
  onChange,
}: {
  id: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div id={id} className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const checked = value.includes(option.value);
        return (
          <label
            key={option.value}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
              checked
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border text-foreground hover:bg-muted/50"
            )}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(next) =>
                onChange(
                  next ? [...value, option.value] : value.filter((v) => v !== option.value)
                )
              }
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = String(Math.floor(i / 4)).padStart(2, "0");
  const minute = String((i % 4) * 15).padStart(2, "0");
  return `${hour}:${minute}`;
});

function TimePicker({
  value,
  label,
  invalid,
  onChange,
}: {
  value: string;
  label: string;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`${label} : ${value}`}
            aria-invalid={invalid || undefined}
            className="w-24 justify-between font-mono font-normal tabular-nums"
          >
            {value}
            <Clock className="text-muted-foreground" data-icon="inline-end" />
          </Button>
        }
      />
      <PopoverContent className="w-32 p-1" align="start">
        <div className="max-h-64 overflow-y-auto">
          {TIME_OPTIONS.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => {
                onChange(time);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left font-mono text-sm tabular-nums hover:bg-accent hover:text-accent-foreground",
                time === value && "bg-accent text-accent-foreground"
              )}
            >
              {time}
              {time === value && <Check className="size-3.5" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type Day = (typeof WEEK_DAYS)[number];

const WEEKDAYS: Day[] = ["mon", "tue", "wed", "thu", "fri"];

// Raccourcis pour les horaires les plus courants : on part de là, puis on
// ajuste un jour si besoin.
const HOUR_PRESETS: { label: string; days: Day[] }[] = [
  { label: "Du lundi au vendredi, 9 h à 18 h", days: WEEKDAYS },
  { label: "Du lundi au samedi, 9 h à 18 h", days: [...WEEKDAYS, "sat"] },
  { label: "Tous les jours, 9 h à 18 h", days: [...WEEK_DAYS] },
];

export function WeeklyHoursField({
  id,
  labelledBy,
  value,
  unset = false,
  onChange,
}: {
  id: string;
  labelledBy: string;
  value: WeeklyHours;
  // Rien n'est encore enregistré : l'assistant répond alors à toute heure
  // (isOpenAt sans horaires). L'écran le dit au lieu d'afficher « Fermé ».
  unset?: boolean;
  onChange: (value: WeeklyHours) => void;
}) {
  function updateDay(day: Day, patch: Partial<WeeklyHours[Day]>) {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  }

  function applyPreset(days: Day[]) {
    onChange(
      Object.fromEntries(
        WEEK_DAYS.map((day) => [
          day,
          { closed: !days.includes(day), open: "09:00", close: "18:00" },
        ])
      ) as WeeklyHours
    );
  }

  // Recopie les heures du premier jour ouvert sur tous les autres jours ouverts.
  const firstOpen = WEEK_DAYS.find((day) => !value[day].closed);
  function copyFirstOpenDay() {
    if (!firstOpen) return;
    const { open, close } = value[firstOpen];
    onChange(
      Object.fromEntries(
        WEEK_DAYS.map((day) => [day, value[day].closed ? value[day] : { ...value[day], open, close }])
      ) as WeeklyHours
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Horaires courants">
        {HOUR_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset(preset.days)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {unset && (
        <p id={`${id}-unset`} className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Horaires non précisés : l&apos;assistant répond à toute heure. Choisissez un horaire courant ou
          ouvrez vos jours pour qu&apos;il annonce vos heures et ce que vous faites en dehors.
        </p>
      )}
      <div
        id={id}
        role="group"
        aria-labelledby={labelledBy}
        aria-describedby={unset ? `${id}-unset` : undefined}
        className="divide-y divide-border rounded-lg border border-border"
      >
        {WEEK_DAYS.map((day) => {
          const hours = value[day];
          const invalid = !hours.closed && hours.close <= hours.open;
          const switchId = `${id}-${day}`;
          return (
            <div key={day} className="px-3 py-2.5">
              <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex w-36 shrink-0 items-center gap-2.5">
                  <Switch
                    id={switchId}
                    checked={!hours.closed}
                    onCheckedChange={(open) => updateDay(day, { closed: !open })}
                  />
                  <label htmlFor={switchId} className="text-sm font-medium text-foreground">
                    {WEEK_DAY_LABELS[day]}
                  </label>
                </div>
                {hours.closed ? (
                  <span className="text-sm text-muted-foreground">{unset ? "Non précisé" : "Fermé"}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <TimePicker
                      value={hours.open}
                      label={`Ouverture ${WEEK_DAY_LABELS[day]}`}
                      invalid={invalid}
                      onChange={(open) => updateDay(day, { open })}
                    />
                    <span aria-hidden="true" className="text-muted-foreground">
                      à
                    </span>
                    <TimePicker
                      value={hours.close}
                      label={`Fermeture ${WEEK_DAY_LABELS[day]}`}
                      invalid={invalid}
                      onChange={(close) => updateDay(day, { close })}
                    />
                  </div>
                )}
              </div>
              {invalid && (
                <p role="alert" className="mt-1.5 text-xs text-destructive sm:pl-[10.25rem]">
                  L&apos;heure de fermeture doit venir après l&apos;ouverture.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {firstOpen && WEEK_DAYS.filter((day) => !value[day].closed).length > 1 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={copyFirstOpenDay}
          className="h-auto min-h-8 whitespace-normal text-left"
        >
          <Copy aria-hidden="true" data-icon="inline-start" />
          Copier le {WEEK_DAY_LABELS[firstOpen].toLowerCase()} sur tous les jours ouverts
        </Button>
      )}
    </div>
  );
}

// Colonnes des listes de règles, selon le champ : on nomme ce que le client
// saisit plutôt qu'un « Condition / Action » abstrait.
const RULE_COLUMNS: Record<
  string,
  {
    trigger: string;
    target: string;
    triggerPlaceholder: string;
    targetPlaceholder: string;
    // « minutes » : la durée se choisit dans une liste au lieu d'un champ libre.
    targetType?: "tel" | "minutes";
    empty: string;
    // Libellés propres au champ : bouton d'ajout et nom d'une ligne.
    addLabel?: string;
    rowLabel?: string;
  }
> = {
  appointmentTypes: {
    trigger: "Prestation",
    target: "Durée",
    triggerPlaceholder: "Coupe femme",
    targetPlaceholder: "Durée",
    targetType: "minutes",
    empty: "Aucune prestation : l'assistant utilise la durée par défaut.",
    addLabel: "Ajouter une prestation",
    rowLabel: "prestation",
  },
  callRouting: {
    trigger: "Motif de l'appel",
    target: "Transférer vers",
    triggerPlaceholder: "Urgence",
    targetPlaceholder: "06 12 34 56 78",
    targetType: "tel",
    empty: "Aucune redirection : l'assistant prend un message pour chaque appel.",
  },
  sortingRules: {
    trigger: "Si l'e-mail parle de",
    target: "Alors",
    triggerPlaceholder: "facture",
    targetPlaceholder: "Transférer à la comptabilité",
    empty: "Aucune règle : les e-mails restent dans la boîte de réception.",
  },
};

const DEFAULT_RULE_COLUMNS = {
  trigger: "Condition",
  target: "Action",
  triggerPlaceholder: "",
  targetPlaceholder: "",
  empty: "Aucune règle pour l'instant.",
};

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180].map((minutes) => ({
  value: String(minutes),
  label: minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60}` : ""}`,
}));

export function RulesListField({
  id,
  fieldKey,
  labelledBy,
  value,
  onChange,
}: {
  id: string;
  fieldKey: string;
  labelledBy: string;
  value: RuleRow[];
  onChange: (value: RuleRow[]) => void;
}) {
  const columns = { ...DEFAULT_RULE_COLUMNS, ...RULE_COLUMNS[fieldKey] };
  const rowLabel = columns.rowLabel ?? "règle";
  const [keys, setKeys] = useState<string[]>(() => value.map(() => crypto.randomUUID()));

  function updateRow(index: number, patch: Partial<RuleRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setKeys((prev) => prev.filter((_, i) => i !== index));
    onChange(value.filter((_, i) => i !== index));
  }

  function addRow(trigger = "") {
    setKeys((prev) => [...prev, crypto.randomUUID()]);
    onChange([...value, { trigger, target: "" }]);
    const index = value.length;
    requestAnimationFrame(() =>
      document.getElementById(`${id}-${trigger ? "target" : "trigger"}-${index}`)?.focus()
    );
  }

  const usedTriggers = new Set(value.map((row) => row.trigger.trim().toLowerCase()));
  const suggestions =
    fieldKey === "callRouting"
      ? COMMON_CALL_REASONS.filter((reason) => !usedTriggers.has(reason.toLowerCase()))
      : [];

  return (
    <div id={id} role="group" aria-labelledby={labelledBy} className="space-y-2">
      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          {columns.empty}
        </p>
      ) : (
        <div className="rounded-lg border border-border">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid"
          >
            <span />
            <span>{columns.trigger}</span>
            <span>{columns.target}</span>
            <span />
          </div>
          <ol className="divide-y divide-border">
            {value.map((row, index) => (
              <li
                key={keys[index] ?? index}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)_2rem] items-center gap-2 px-3 py-2.5 sm:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2rem]"
              >
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <Input
                  id={`${id}-trigger-${index}`}
                  placeholder={columns.triggerPlaceholder}
                  aria-label={`${columns.trigger}, ${rowLabel} ${index + 1}`}
                  value={row.trigger}
                  onChange={(e) => updateRow(index, { trigger: e.target.value })}
                />
                {columns.targetType === "minutes" ? (
                  <Select
                    value={row.target || null}
                    items={DURATION_OPTIONS}
                    onValueChange={(next) => updateRow(index, { target: next ?? "" })}
                  >
                    <SelectTrigger
                      id={`${id}-target-${index}`}
                      aria-label={`${columns.target}, ${rowLabel} ${index + 1}`}
                      className="col-start-2 row-start-2 w-full sm:col-start-auto sm:row-start-auto"
                    >
                      <SelectValue placeholder="Durée par défaut" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`${id}-target-${index}`}
                    type={columns.targetType ?? "text"}
                    inputMode={columns.targetType === "tel" ? "tel" : undefined}
                    autoComplete={columns.targetType === "tel" ? "tel" : "off"}
                    placeholder={columns.targetPlaceholder}
                    aria-label={`${columns.target}, ${rowLabel} ${index + 1}`}
                    value={row.target}
                    onChange={(e) => updateRow(index, { target: e.target.value })}
                    className="col-start-2 row-start-2 sm:col-start-auto sm:row-start-auto"
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Supprimer la ${rowLabel} ${index + 1}`}
                  className="col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto"
                  onClick={() => removeRow(index)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={() => addRow()}>
          <Plus aria-hidden="true" data-icon="inline-start" />
          {columns.addLabel ?? "Ajouter une règle"}
        </Button>
        {suggestions.length > 0 && (
          <>
            <span className="ml-1 text-xs text-muted-foreground">Motifs courants :</span>
            {suggestions.map((reason) => (
              <Button
                key={reason}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addRow(reason)}
                aria-label={`Ajouter une redirection pour le motif « ${reason} »`}
              >
                <Plus aria-hidden="true" data-icon="inline-start" />
                {reason}
              </Button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// « Partir d'un modèle » : remplit un champ de texte avec le modèle d'un
// secteur. Le texte d'avant reste récupérable par « Annuler ».
export function TemplatePicker({
  part,
  value,
  companyName,
  onChange,
}: {
  part: "greeting" | "instructions";
  value: string;
  companyName: string | undefined;
  onChange: (value: string) => void;
}) {
  function apply(template: CallTemplate) {
    const previous = value;
    onChange(fillTemplate(template[part], companyName));
    toast.success(`Modèle « ${template.sector} » appliqué. Adaptez-le à votre activité.`, {
      ...(previous.trim() && {
        action: { label: "Annuler", onClick: () => onChange(previous) },
      }),
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="sm" />}>
        <FileText aria-hidden="true" data-icon="inline-start" />
        Partir d&apos;un modèle
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Votre secteur d&apos;activité</DropdownMenuLabel>
          {CALL_TEMPLATES.map((template) => (
            <DropdownMenuItem key={template.id} onClick={() => apply(template)}>
              {template.sector}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
