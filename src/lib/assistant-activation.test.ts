import { describe, expect, it } from "vitest";
import type { ConfigField, ServiceDTO } from "@/lib/catalog";
import { calculateMonthlyPriceCents, type SubscriptionTier } from "@/lib/subscription-pricing";
import {
  ACTIVATION_TOOLS,
  activationFields,
  coerceConfiguration,
  RECAP_QUESTION,
  confirmsRecap,
  describeActivationForm,
  isExplicitConfirmation,
  monthlyPriceFor,
  readUnits,
} from "@/lib/assistant-activation";

const FIELDS: ConfigField[] = [
  { key: "greeting", label: "Message d'accueil", type: "textarea" },
  {
    key: "objectives",
    label: "Objectifs",
    type: "multiselect",
    required: true,
    options: [
      { value: "info", label: "Renseigner" },
      { value: "booking", label: "Prendre rendez-vous" },
    ],
  },
  {
    key: "tone",
    label: "Ton",
    type: "select",
    options: [
      { value: "formal", label: "Vouvoiement" },
      { value: "friendly", label: "Chaleureux" },
    ],
  },
  { key: "bookingDuration", label: "Durée", type: "text", showIf: { key: "objectives", includes: "booking" } },
  { key: "hours", label: "Horaires", type: "weekly-hours" },
  { key: "rules", label: "Transferts", type: "rules-list" },
  { key: "keywords", label: "Mots-clés", type: "tags" },
  { key: "consent", label: "Accord", type: "consent", required: true },
  { key: "productCatalog", label: "Catalogue", type: "textarea", required: true },
  { key: "phoneLine", label: "Ligne", type: "tel" },
];

const TIER: SubscriptionTier = {
  minUnits: 150,
  maxUnits: 6000,
  stepUnits: 50,
  unit: "MINUTE",
  baseMonthlyPriceCents: 2500,
  extraUnitPriceCents: 700,
};

function service(overrides: Partial<ServiceDTO> = {}): ServiceDTO {
  return {
    id: "svc_1",
    slug: "standard",
    name: "Standard",
    description: "Décroche.",
    category: "TELEPHONY",
    monthlyPriceCents: 2500,
    usageCap: null,
    tier: null,
    configFields: FIELDS,
    sortOrder: 1,
    ...overrides,
  } as ServiceDTO;
}

describe("activationFields", () => {
  it("écarte le catalogue produits et les champs réglés après le paiement, comme l'écran", () => {
    const keys = activationFields(service(), ["phoneLine"]).map((field) => field.key);
    expect(keys).not.toContain("productCatalog");
    expect(keys).not.toContain("phoneLine");
    expect(keys).toContain("objectives");
  });
});

describe("describeActivationForm", () => {
  it("donne au modèle les obligatoires, les options et le volume possible", () => {
    const form = describeActivationForm(service({ tier: TIER }), activationFields(service(), ["phoneLine"]));
    expect(form.fields.find((field) => field.key === "objectives")).toMatchObject({ required: true });
    expect(form.fields.find((field) => field.key === "bookingDuration")).toMatchObject({ onlyIf: { key: "objectives" } });
    expect(form.volume).toEqual({ unit: "MINUTE", min: 150, max: 6000, step: 50 });
  });
});

describe("coerceConfiguration", () => {
  const fields = activationFields(service(), ["phoneLine"]);

  it("garde chaque réponse au format du formulaire", () => {
    expect(
      coerceConfiguration(fields, {
        greeting: "  Bonjour  ",
        objectives: ["booking", "inventé"],
        tone: "friendly",
        bookingDuration: "30 min",
        hours: { mon: { closed: false, open: "08:30", close: "18:00" }, sun: { closed: true } },
        rules: [{ trigger: "Urgence", target: "06 00 00 00 00" }, { target: "sans motif" }],
        keywords: ["fuite", 42, " "],
        consent: true,
      })
    ).toMatchObject({
      greeting: "Bonjour",
      objectives: ["booking"],
      tone: "friendly",
      bookingDuration: "30 min",
      hours: { mon: { closed: false, open: "08:30", close: "18:00" }, sun: { closed: true } },
      rules: [{ trigger: "Urgence", target: "06 00 00 00 00" }],
      keywords: ["fuite"],
      consent: "true",
    });
  });

  it("écarte les clés inconnues, les options hors liste et un accord non donné", () => {
    const configuration = coerceConfiguration(fields, {
      productCatalog: "volé",
      phoneLine: "+33",
      admin: true,
      tone: "agressif",
      consent: "oui",
      hours: { mon: { open: "25:00", close: "18:00" } },
    });
    expect(configuration).toEqual({});
  });

  it("n'enregistre pas un champ dont la condition n'est pas remplie", () => {
    expect(coerceConfiguration(fields, { objectives: ["info"], bookingDuration: "30 min" })).toEqual({
      objectives: ["info"],
    });
  });

  it("supporte une configuration absente", () => {
    expect(coerceConfiguration(fields, "rien")).toEqual({});
  });
});

describe("monthlyPriceFor", () => {
  it("reprend le prix de l'écran pour le volume choisi", () => {
    expect(monthlyPriceFor(service({ tier: TIER }), 300)).toBe(calculateMonthlyPriceCents(TIER, 300));
    expect(monthlyPriceFor(service({ tier: TIER }), null)).toBe(calculateMonthlyPriceCents(TIER, 150));
  });

  it("refuse un volume hors paliers", () => {
    expect(monthlyPriceFor(service({ tier: TIER }), 175)).toBeNull();
    expect(monthlyPriceFor(service({ tier: TIER }), 9000)).toBeNull();
  });

  it("prend le prix fixe d'une solution sans volume", () => {
    expect(monthlyPriceFor(service({ monthlyPriceCents: 800 }), 300)).toBe(800);
  });
});

describe("readUnits", () => {
  it("n'accepte qu'un entier", () => {
    expect(readUnits(300)).toBe(300);
    expect(readUnits(300.5)).toBeNull();
    expect(readUnits("300")).toBeNull();
  });
});

describe("ACTIVATION_TOOLS", () => {
  it("expose les quatre outils de l'activation", () => {
    expect(ACTIVATION_TOOLS.map((tool) => tool.type === "function" && tool.function.name)).toEqual([
      "list_my_organizations",
      "get_activation_form",
      "quote_price",
      "activate_service",
    ]);
  });
});

describe("isExplicitConfirmation", () => {
  it("accepte un accord clair", () => {
    for (const yes of ["Oui", "oui !", "OK", "D'accord", "Je confirme", "Oui, vas-y", "c'est bon", "Parfait."]) {
      expect(isExplicitConfirmation(yes), yes).toBe(true);
    }
  });

  it("refuse une réponse qui n'est pas un accord, même si elle y ressemble", () => {
    for (const other of [
      "Je les remplirai plus tard",
      "oui mais change le nom",
      "Non",
      "pas encore",
      "Oui ?",
      "Attendez",
      "ok pour le nom, modifiez les minutes",
      "Accueil campus",
      `oui ${"très ".repeat(30)}bien`,
    ]) {
      expect(isExplicitConfirmation(other), other).toBe(false);
    }
  });
});

describe("confirmsRecap", () => {
  const recap = { role: "assistant" as const, text: `Récapitulatif : Standard, 25 €. ${RECAP_QUESTION}` };

  it("accepte un oui qui répond au récapitulatif", () => {
    expect(confirmsRecap([recap, { role: "user", text: "Oui" }])).toBe(true);
  });

  it("refuse un oui qui répond à une autre question", () => {
    expect(confirmsRecap([{ role: "assistant", text: "Avez-vous un code promo ?" }, { role: "user", text: "Oui" }])).toBe(false);
    expect(confirmsRecap([{ role: "assistant", text: "Quel nom ?" }, { role: "user", text: "ok, Boutique Lyon" }])).toBe(false);
  });

  it("refuse une autre réponse au récapitulatif", () => {
    expect(confirmsRecap([recap, { role: "user", text: "Je les remplirai plus tard" }])).toBe(false);
    expect(confirmsRecap([{ role: "user", text: "Oui" }])).toBe(false);
  });
});
