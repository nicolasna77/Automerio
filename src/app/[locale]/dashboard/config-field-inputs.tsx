"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, CalendarDays, Clock, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    <div id={id} className="space-y-2">
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.includes(option.value)}
            onCheckedChange={(checked) =>
              onChange(
                checked
                  ? [...value, option.value]
                  : value.filter((v) => v !== option.value)
              )
            }
          />
          {option.label}
        </label>
      ))}
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
  disabled,
  onChange,
}: {
  value: string;
  label: string;
  disabled?: boolean;
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
            disabled={disabled}
            aria-label={`${label} : ${value}`}
            className="w-24 justify-between font-normal"
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
                "flex w-full items-center justify-between rounded-2xl px-2.5 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
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

export function WeeklyHoursField({
  id,
  labelledBy,
  value,
  onChange,
}: {
  id: string;
  labelledBy: string;
  value: WeeklyHours;
  onChange: (value: WeeklyHours) => void;
}) {
  function updateDay(day: (typeof WEEK_DAYS)[number], patch: Partial<WeeklyHours[typeof day]>) {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  }

  return (
    <div id={id} role="group" aria-labelledby={labelledBy} className="space-y-2">
      {WEEK_DAYS.map((day) => {
        const hours = value[day];
        return (
          <div
            key={day}
            className="flex flex-col gap-1.5 border-b border-border pb-2 text-sm last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3 sm:border-b-0 sm:pb-0"
          >
            <label className="flex items-center gap-2 sm:w-28 sm:shrink-0">
              <Checkbox
                checked={!hours.closed}
                onCheckedChange={(checked) =>
                  updateDay(day, { closed: checked !== true })
                }
              />
              {WEEK_DAY_LABELS[day]}
            </label>
            <div className="flex items-center gap-2 pl-6 sm:gap-3 sm:pl-0">
              <TimePicker
                value={hours.open}
                label={`Ouverture ${WEEK_DAY_LABELS[day]}`}
                disabled={hours.closed}
                onChange={(open) => updateDay(day, { open })}
              />
              <span aria-hidden="true" className="text-muted-foreground">
                –
              </span>
              <TimePicker
                value={hours.close}
                label={`Fermeture ${WEEK_DAY_LABELS[day]}`}
                disabled={hours.closed}
                onChange={(close) => updateDay(day, { close })}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RulesListField({
  id,
  labelledBy,
  value,
  onChange,
}: {
  id: string;
  labelledBy: string;
  value: RuleRow[];
  onChange: (value: RuleRow[]) => void;
}) {
  const [keys, setKeys] = useState<string[]>(() =>
    value.map(() => crypto.randomUUID())
  );

  function updateRow(index: number, patch: Partial<RuleRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setKeys((prev) => prev.filter((_, i) => i !== index));
    onChange(value.filter((_, i) => i !== index));
  }

  function addRow() {
    setKeys((prev) => [...prev, crypto.randomUUID()]);
    onChange([...value, { trigger: "", target: "" }]);
  }

  return (
    <div id={id} role="group" aria-labelledby={labelledBy} className="space-y-2">
      {value.map((row, index) => (
        <div
          key={keys[index] ?? index}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Condition"
              aria-label={`Condition de la règle ${index + 1}`}
              value={row.trigger}
              onChange={(e) => updateRow(index, { trigger: e.target.value })}
            />
            <Input
              placeholder="Action"
              aria-label={`Action de la règle ${index + 1}`}
              value={row.target}
              onChange={(e) => updateRow(index, { target: e.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Supprimer la règle ${index + 1}`}
            className="self-end sm:self-auto"
            onClick={() => removeRow(index)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus aria-hidden="true" data-icon="inline-start" />
        Ajouter une règle
      </Button>
    </div>
  );
}
