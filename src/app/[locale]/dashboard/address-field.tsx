"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Service de géocodage de la Géoplateforme (IGN), successeur de l'API
// Adresse (BAN) : gratuit, sans clé, ouvert aux appels du navigateur.
const GEOCODING_URL = "https://data.geopf.fr/geocodage/search";
const MIN_QUERY = 3;
const DEBOUNCE_MS = 250;

type Suggestion = { id: string; label: string; context: string };

// Champ adresse avec suggestions de la Base Adresse Nationale. Le texte
// saisi reste accepté tel quel : une suggestion aide, elle n'oblige pas.
export function AddressField({
  id,
  value,
  placeholder,
  hasError,
  describedBy,
  onChange,
  onBlur,
}: {
  id: string;
  value: string;
  placeholder?: string;
  hasError?: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  const t = useTranslations("Dashboard.addressField");
  const listId = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query === null || query.trim().length < MIN_QUERY) return;
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          limit: "5",
          autocomplete: "1",
          index: "address",
        });
        const res = await fetch(`${GEOCODING_URL}?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          features: { properties: { id: string; label: string; context: string } }[];
        };
        setSuggestions(
          data.features.map(({ properties }) => ({
            id: properties.id,
            label: properties.label,
            context: properties.context,
          }))
        );
        setOpen(true);
        setActive(-1);
      } catch {
        // Service indisponible ou requête annulée : le champ reste un champ texte.
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  function choose(suggestion: Suggestion) {
    onChange(suggestion.label);
    setQuery(null);
    setOpen(false);
    setSuggestions([]);
  }

  const expanded = open && suggestions.length > 0;

  return (
    <div>
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          autoComplete="street-address"
          placeholder={placeholder ?? t("placeholder")}
          className="pl-9"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setQuery(e.target.value);
            if (e.target.value.trim().length < MIN_QUERY) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (!expanded) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              choose(suggestions[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          onBlur={() => {
            // Laisse le temps d'un clic dans la liste avant de la fermer.
            setTimeout(() => setOpen(false), 150);
            onBlur?.();
          }}
        />
      </div>
      {/* Dans le flux de la page : une carte au contenu masqué ne la coupe pas. */}
      <ul
        id={listId}
        role="listbox"
        aria-label={t("suggestions")}
        hidden={!expanded}
        className="mt-1 rounded-lg border border-border bg-popover p-1 shadow-sm"
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion.id}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(e) => {
              e.preventDefault();
              choose(suggestion);
            }}
            onMouseEnter={() => setActive(index)}
            className={cn(
              "cursor-pointer rounded-md px-2.5 py-2 text-sm",
              index === active ? "bg-accent text-accent-foreground" : "text-foreground"
            )}
          >
            {suggestion.label}
            <span className="block text-xs text-muted-foreground">{suggestion.context}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
