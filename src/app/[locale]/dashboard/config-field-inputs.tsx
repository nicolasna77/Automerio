"use client";

import { useLabels } from "@/hooks/use-labels";
import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { WEEK_DAYS, type RuleRow, type WeeklyHours } from "@/lib/catalog";

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
  const t = useTranslations("Dashboard.fields.date");
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
              : (placeholder ?? t("placeholder"))}
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
  const t = useTranslations("Dashboard.fields.tags");
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
                aria-label={t("remove", { tag })}
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
        placeholder={placeholder ?? t("placeholder")}
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
  const t = useTranslations("Dashboard.fields.time");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={t("label", { label, value })}
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
const HOUR_PRESETS: { key: "weekdays" | "weekdaysSaturday" | "everyDay"; days: Day[] }[] = [
  { key: "weekdays", days: WEEKDAYS },
  { key: "weekdaysSaturday", days: [...WEEKDAYS, "sat"] },
  { key: "everyDay", days: [...WEEK_DAYS] },
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
  const t = useTranslations("Dashboard.weeklyHours");
  const tHours = useTranslations("Dashboard.fields.hours");
  const labels = useLabels();

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
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={tHours("presetsLabel")}>
        {HOUR_PRESETS.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset(preset.days)}
          >
            {tHours(`presets.${preset.key}`)}
          </Button>
        ))}
      </div>

      {unset && (
        <p id={`${id}-unset`} className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t("unsetNotice")}
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
                    {labels.weekDay(day)}
                  </label>
                </div>
                {hours.closed ? (
                  <span className="text-sm text-muted-foreground">{unset ? t("unsetDay") : t("closed")}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <TimePicker
                      value={hours.open}
                      label={tHours("opening", { day: labels.weekDay(day) })}
                      invalid={invalid}
                      onChange={(open) => updateDay(day, { open })}
                    />
                    <span aria-hidden="true" className="text-muted-foreground">
                      {tHours("to")}
                    </span>
                    <TimePicker
                      value={hours.close}
                      label={tHours("closing", { day: labels.weekDay(day) })}
                      invalid={invalid}
                      onChange={(close) => updateDay(day, { close })}
                    />
                  </div>
                )}
              </div>
              {invalid && (
                <p role="alert" className="mt-1.5 text-xs text-destructive sm:pl-[10.25rem]">
                  {tHours("invalid")}
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
          {tHours("copyFirst", { day: labels.weekDay(firstOpen).toLowerCase() })}
        </Button>
      )}
    </div>
  );
}

// Colonnes des listes de règles, selon le champ : on nomme ce que le client
// saisit plutôt qu'un « Condition / Action » abstrait (textes dans
// Dashboard.fields.rules). « minutes » : la durée se choisit dans une liste.
const RULE_FIELDS = ["appointmentTypes", "callRouting", "sortingRules"] as const;
type RuleField = (typeof RULE_FIELDS)[number] | "default";
const RULE_TARGET_TYPES: Partial<Record<RuleField, "tel" | "minutes">> = {
  appointmentTypes: "minutes",
  callRouting: "tel",
};

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180];

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
  const t = useTranslations("Dashboard.fields");
  const ruleField: RuleField = (RULE_FIELDS as readonly string[]).includes(fieldKey) ? (fieldKey as RuleField) : "default";
  const columns = {
    trigger: t(`rules.${ruleField}.trigger`),
    target: t(`rules.${ruleField}.target`),
    triggerPlaceholder: t(`rules.${ruleField}.triggerPlaceholder`),
    targetPlaceholder: t(`rules.${ruleField}.targetPlaceholder`),
    empty: t(`rules.${ruleField}.empty`),
    addLabel: t(`rules.${ruleField}.addLabel`),
    targetType: RULE_TARGET_TYPES[ruleField],
  };
  const rowLabel = t(`rules.${ruleField}.rowLabel`);
  const durationOptions = DURATIONS.map((minutes) => ({
    value: String(minutes),
    label:
      minutes < 60
        ? t("duration.minutes", { minutes })
        : minutes % 60
          ? t("duration.hoursMinutes", { hours: Math.floor(minutes / 60), minutes: minutes % 60 })
          : t("duration.hours", { hours: minutes / 60 }),
  }));
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
                  aria-label={t("rules.cellLabel", { column: columns.trigger, row: rowLabel, index: index + 1 })}
                  value={row.trigger}
                  onChange={(e) => updateRow(index, { trigger: e.target.value })}
                />
                {columns.targetType === "minutes" ? (
                  <Select
                    value={row.target || null}
                    items={durationOptions}
                    onValueChange={(next) => updateRow(index, { target: next ?? "" })}
                  >
                    <SelectTrigger
                      id={`${id}-target-${index}`}
                      aria-label={t("rules.cellLabel", { column: columns.target, row: rowLabel, index: index + 1 })}
                      className="col-start-2 row-start-2 w-full sm:col-start-auto sm:row-start-auto"
                    >
                      <SelectValue placeholder={t("duration.default")} />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map((option) => (
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
                    aria-label={t("rules.cellLabel", { column: columns.target, row: rowLabel, index: index + 1 })}
                    value={row.target}
                    onChange={(e) => updateRow(index, { target: e.target.value })}
                    className="col-start-2 row-start-2 sm:col-start-auto sm:row-start-auto"
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("rules.remove", { row: rowLabel, index: index + 1 })}
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
          {columns.addLabel}
        </Button>
        {suggestions.length > 0 && (
          <>
            <span className="ml-1 text-xs text-muted-foreground">{t("rules.commonReasons")}</span>
            {suggestions.map((reason) => (
              <Button
                key={reason}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addRow(reason)}
                aria-label={t("rules.addReason", { reason })}
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
  const t = useTranslations("Dashboard.fields.templates");
  function apply(template: CallTemplate) {
    const previous = value;
    onChange(fillTemplate(template[part], companyName));
    toast.success(t("applied", { sector: template.sector }), {
      ...(previous.trim() && {
        action: { label: t("undo"), onClick: () => onChange(previous) },
      }),
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="sm" />}>
        <FileText aria-hidden="true" data-icon="inline-start" />
        {t("start")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("sector")}</DropdownMenuLabel>
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
