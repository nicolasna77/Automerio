import { describe, expect, it } from "vitest";
import type { ConfigField } from "@/lib/catalog";
import { buildFieldCategories, SETTINGS_HIDDEN_KEYS } from "./field-categories";

const standard: ConfigField[] = [
  { key: "phoneLine", label: "Numéro existant", type: "tel" },
  { key: "openingHours", label: "Horaires d'ouverture", type: "weekly-hours" },
  { key: "greetingMessage", label: "Message d'accueil", type: "textarea" },
  { key: "callRouting", label: "Redirections", type: "rules-list" },
];

const appointments: ConfigField[] = [
  { key: "calendarLink", label: "Agenda", type: "url", showIf: { key: "objectives", includes: "appointment" } },
  {
    key: "objectives",
    label: "Objectifs",
    type: "multiselect",
    required: true,
    options: [
      { value: "appointment", label: "Rendez-vous" },
      { value: "order", label: "Commande" },
    ],
  },
  { key: "deliveryZone", label: "Zone de livraison", type: "textarea", showIf: { key: "objectives", includes: "order" } },
];

const ids = (fields: ConfigField[], values = {}, omit: string[] = []) =>
  buildFieldCategories(fields, values, omit).map((c) => [c.id, c.fields.map((f) => f.key)]);

describe("buildFieldCategories", () => {
  it("range chaque champ dans sa catégorie, dans l'ordre des étapes", () => {
    expect(ids(standard)).toEqual([
      ["business", ["phoneLine"]],
      ["hours", ["openingHours"]],
      ["messages", ["greetingMessage"]],
      ["rules", ["callRouting"]],
    ]);
  });

  it("place le besoin en premier et ne garde que les champs visibles", () => {
    expect(ids(appointments)).toEqual([["need", ["objectives"]]]);
    expect(ids(appointments, { objectives: ["appointment"] })).toEqual([
      ["need", ["objectives"]],
      ["business", ["calendarLink"]],
    ]);
    // La zone de livraison rejoint le choix « Prise de commande » qui l'affiche.
    expect(ids(appointments, { objectives: ["order"] })).toEqual([["need", ["objectives", "deliveryZone"]]]);
  });

  it("ne propose plus dans les réglages les champs que l'assistant n'utilise pas", () => {
    expect(ids(standard, {}, SETTINGS_HIDDEN_KEYS).map(([id]) => id)).toEqual(["hours", "messages", "rules"]);
  });

  it("écarte les champs demandés et ne crée pas d'étape vide", () => {
    expect(ids(standard, {}, ["greetingMessage"]).map(([id]) => id)).toEqual([
      "business",
      "hours",
      "rules",
    ]);
    expect(buildFieldCategories([], {})).toEqual([]);
  });

  it("respecte une section définie dans le catalogue, après les catégories connues", () => {
    const fields: ConfigField[] = [
      { key: "a", label: "A", type: "text", section: "Spécifique" },
      { key: "b", label: "B", type: "tel" },
    ];
    expect(ids(fields)).toEqual([
      ["business", ["b"]],
      ["section:Spécifique", ["a"]],
    ]);
  });
});
