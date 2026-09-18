"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_WEEKLY_HOURS,
  isFieldEmpty,
  isFieldVisible,
  type ConfigField,
  type Configuration,
  type ConfigValue,
  type RuleRow,
  type WeeklyHours,
} from "@/lib/catalog";
import {
  DateField,
  MultiselectField,
  RulesListField,
  TagsField,
  WeeklyHoursField,
} from "./config-field-inputs";

const DEFAULT_SECTION = "Détail de la solution";

function groupBySection(fields: ConfigField[]): [string, ConfigField[]][] {
  const groups = new Map<string, ConfigField[]>();
  for (const field of fields) {
    const section = field.section ?? DEFAULT_SECTION;
    const existing = groups.get(section);
    if (existing) existing.push(field);
    else groups.set(section, [field]);
  }
  return Array.from(groups.entries());
}

function renderFieldInput({
  field,
  value,
  hasError,
  describedBy,
  onChange,
  markTouched,
}: {
  field: ConfigField;
  value: ConfigValue | undefined;
  hasError: boolean;
  describedBy: string | undefined;
  onChange: (value: ConfigValue) => void;
  markTouched: () => void;
}) {
  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          id={field.key}
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={markTouched}
          required={field.required}
          aria-invalid={hasError}
          aria-describedby={describedBy}
        />
      );

    case "select":
      return (
        <Select
          value={typeof value === "string" ? value : null}
          items={field.options}
          onValueChange={(next) => {
            onChange(next ?? "");
            markTouched();
          }}
        >
          <SelectTrigger
            id={field.key}
            className="w-full"
            onBlur={markTouched}
            aria-invalid={hasError}
            aria-describedby={describedBy}
          >
            <SelectValue placeholder={field.placeholder ?? "Choisir…"} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "date":
      return (
        <DateField
          id={field.key}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          hasError={hasError}
          onChange={(next) => {
            onChange(next);
            markTouched();
          }}
        />
      );

    case "tags":
      return (
        <TagsField
          id={field.key}
          value={Array.isArray(value) ? (value as string[]) : []}
          placeholder={field.placeholder}
          onChange={onChange}
        />
      );

    case "multiselect":
      return (
        <MultiselectField
          id={field.key}
          options={field.options ?? []}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
        />
      );

    case "weekly-hours":
      return (
        <WeeklyHoursField
          id={field.key}
          labelledBy={`${field.key}-label`}
          value={
            value && typeof value === "object" && !Array.isArray(value)
              ? (value as WeeklyHours)
              : DEFAULT_WEEKLY_HOURS
          }
          onChange={onChange}
        />
      );

    case "rules-list":
      return (
        <RulesListField
          id={field.key}
          labelledBy={`${field.key}-label`}
          value={Array.isArray(value) ? (value as RuleRow[]) : []}
          onChange={onChange}
        />
      );

    case "file-link":
      return (
        <Input
          id={field.key}
          type="url"
          placeholder={field.placeholder ?? "https://…"}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={markTouched}
          required={field.required}
          aria-invalid={hasError}
          aria-describedby={describedBy}
        />
      );

    default:
      return (
        <Input
          id={field.key}
          type={field.type === "connection" ? "text" : field.type}
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={markTouched}
          required={field.required}
          aria-invalid={hasError}
          aria-describedby={describedBy}
        />
      );
  }
}

export function ConfigFieldsForm({
  fields,
  values,
  onChange,
  submitAttempted = false,
  omitKeys = [],
}: {
  fields: ConfigField[];
  values: Configuration;
  onChange: (key: string, value: ConfigValue) => void;
  submitAttempted?: boolean;
  omitKeys?: string[];
}) {
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const visibleFields = fields.filter(
    (field) => !omitKeys.includes(field.key) && isFieldVisible(field, values)
  );
  if (visibleFields.length === 0) return null;

  function markTouched(key: string) {
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

  const sections = groupBySection(visibleFields);
  const showHeadings = sections.length > 1;

  return (
    <div className="space-y-6 py-2">
      {sections.map(([section, sectionFields], sectionIndex) => (
        <div
          key={section}
          className={cn(
            "space-y-4",
            sectionIndex > 0 && "border-t border-border pt-4"
          )}
        >
          {showHeadings && (
            <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {section}
            </h4>
          )}

          {sectionFields.map((field) => {
            const value = values[field.key];
            const hasError =
              !!field.required &&
              isFieldEmpty(field, values) &&
              (touched.has(field.key) || submitAttempted);
            const showHelp = hasError || !!field.helpText;

            if (field.type === "consent") {
              return (
                <div key={field.key} className="space-y-1.5">
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      id={field.key}
                      checked={value === "true"}
                      onCheckedChange={(checked) => {
                        onChange(field.key, checked ? "true" : "");
                        markTouched(field.key);
                      }}
                      aria-invalid={hasError}
                      className="mt-0.5"
                    />
                    <span>
                      {field.label}
                      {field.required && (
                        <span aria-hidden="true" className="text-destructive">
                          {" "}
                          *
                        </span>
                      )}
                    </span>
                  </label>
                  {hasError ? (
                    <p className="pl-6 text-xs text-destructive">
                      Ce champ est requis.
                    </p>
                  ) : (
                    field.helpText && (
                      <p className="pl-6 text-xs text-muted-foreground">
                        {field.helpText}
                      </p>
                    )
                  )}
                </div>
              );
            }

            const isFieldGroup =
              field.type === "weekly-hours" || field.type === "rules-list";

            return (
              <div key={field.key} className="space-y-2">
                <Label
                  id={`${field.key}-label`}
                  htmlFor={isFieldGroup ? undefined : field.key}
                >
                  {field.label}
                  {field.required && (
                    <span aria-hidden="true" className="text-destructive">
                      {" "}
                      *
                    </span>
                  )}
                </Label>

                {renderFieldInput({
                  field,
                  value,
                  hasError,
                  describedBy: showHelp ? `${field.key}-help` : undefined,
                  onChange: (next) => onChange(field.key, next),
                  markTouched: () => markTouched(field.key),
                })}

                {showHelp && (
                  <p
                    id={`${field.key}-help`}
                    className={cn(
                      "text-xs",
                      hasError ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {hasError ? "Ce champ est requis." : field.helpText}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
