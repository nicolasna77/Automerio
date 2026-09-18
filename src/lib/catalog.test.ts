import { describe, expect, it } from "vitest";
import {
  findMissingRequiredField,
  formatCents,
  formatConfigValue,
  formatPrice,
  isFieldVisible,
  needsCalendarConnection,
  needsFacebookConnection,
  needsInstagramConnection,
  needsPhoneNumber,
  needsProductCatalog,
  needsWhatsAppConnection,
  setupAction,
  setupHint,
  withCleanProductCatalog,
  type ConfigField,
} from "./catalog";
import { buildSystemPrompt } from "./voice-agent/prompt";

describe("formatCents", () => {
  it("n'affiche pas de décimales inutiles", () => {
    expect(formatCents(9000)).toBe("90 €");
  });

  it("garde les centimes quand il y en a", () => {
    expect(formatCents(7950)).toBe("79,50 €");
  });

  it("gère la gratuité", () => {
    expect(formatCents(0)).toBe("0 €");
  });
});

describe("formatPrice", () => {
  it("compose les deux lignes du modèle hybride", () => {
    expect(formatPrice(90000, 7900)).toBe("900 € + 79 €/mois");
  });

  it("n'affiche que l'abonnement quand il n'y a pas de frais de mise en place", () => {
    expect(formatPrice(null, 5900)).toBe("59 €/mois");
  });

  it("n'affiche que la mise en place quand il n'y a pas d'abonnement", () => {
    expect(formatPrice(45000, null)).toBe("450 €");
  });

  it("renvoie un tiret quand aucun prix n'est défini", () => {
    expect(formatPrice(null, null)).toBe("—");
  });
});

const deployable = {
  status: "ACTIVE" as const,
  externalPhoneNumber: null,
  calendarConnected: false,
  whatsappConnected: false,
  facebookConnected: false,
  instagramConnected: false,
  configuration: {},
  service: { slug: "standard-telephonique-ia" },
};

describe("étapes de mise en service restantes", () => {
  it("réclame un numéro pour une prestation de téléphonie sans numéro", () => {
    expect(needsPhoneNumber(deployable)).toBe(true);
  });

  it("ne réclame plus rien une fois le numéro attribué", () => {
    expect(
      needsPhoneNumber({ ...deployable, externalPhoneNumber: "+33123456789" })
    ).toBe(false);
  });

  it("ne réclame pas de numéro pour une prestation qui n'est pas téléphonique", () => {
    expect(
      needsPhoneNumber({ ...deployable, service: { slug: "assistant-whatsapp" } })
    ).toBe(false);
  });

  it("ne réclame rien tant que la prestation n'est pas payée", () => {
    expect(needsPhoneNumber({ ...deployable, status: "PENDING_PAYMENT" })).toBe(false);
  });

  it("ne réclame rien sur une prestation résiliée", () => {
    expect(needsPhoneNumber({ ...deployable, status: "CANCELED" })).toBe(false);
  });

  it("réclame l'agenda uniquement si la prise de rendez-vous est un objectif", () => {
    const withAppointments = {
      ...deployable,
      service: { slug: "prise-rdv-telephone" },
      configuration: { objectives: ["appointment"] },
    };
    expect(needsCalendarConnection(withAppointments)).toBe(true);
    expect(
      needsCalendarConnection({ ...withAppointments, configuration: { objectives: ["order"] } })
    ).toBe(false);
  });

  it("réclame la connexion du canal correspondant, et d'aucun autre", () => {
    const whatsapp = { ...deployable, service: { slug: "assistant-whatsapp" } };
    expect(needsWhatsAppConnection(whatsapp)).toBe(true);
    expect(needsFacebookConnection(whatsapp)).toBe(false);
    expect(needsInstagramConnection(whatsapp)).toBe(false);

    const instagram = { ...deployable, service: { slug: "assistant-instagram" } };
    expect(needsInstagramConnection(instagram)).toBe(true);
    expect(needsInstagramConnection({ ...instagram, instagramConnected: true })).toBe(false);
  });
});

describe("visibilité conditionnelle d'un champ", () => {
  const field: ConfigField = {
    key: "deliveryZone",
    label: "Zone de livraison",
    type: "text",
    showIf: { key: "objectives", includes: "order" },
  };

  it("est visible quand la valeur attendue est présente dans une liste", () => {
    expect(isFieldVisible(field, { objectives: ["appointment", "order"] })).toBe(true);
  });

  it("est masqué quand la liste ne contient pas la valeur", () => {
    expect(isFieldVisible(field, { objectives: ["appointment"] })).toBe(false);
  });

  it("accepte aussi une valeur simple, pas seulement une liste", () => {
    expect(isFieldVisible(field, { objectives: "order" })).toBe(true);
  });

  it("est toujours visible sans condition", () => {
    expect(isFieldVisible({ key: "faq", label: "FAQ", type: "textarea" }, {})).toBe(true);
  });
});

describe("champs obligatoires manquants", () => {
  const fields: ConfigField[] = [
    { key: "phoneLine", label: "Ligne", type: "tel", required: true },
    {
      key: "deliveryZone",
      label: "Zone de livraison",
      type: "text",
      required: true,
      showIf: { key: "objectives", includes: "order" },
    },
  ];

  it("signale un champ requis vide", () => {
    expect(findMissingRequiredField(fields, {})?.key).toBe("phoneLine");
  });

  it("traite une chaîne d'espaces comme vide", () => {
    expect(findMissingRequiredField(fields, { phoneLine: "   " })?.key).toBe("phoneLine");
  });

  it("ignore un champ requis que sa condition rend invisible", () => {
    expect(findMissingRequiredField(fields, { phoneLine: "+33123456789" })).toBeUndefined();
  });

  it("le réclame dès que sa condition est remplie", () => {
    expect(
      findMissingRequiredField(fields, {
        phoneLine: "+33123456789",
        objectives: ["order"],
      })?.key
    ).toBe("deliveryZone");
  });
});

describe("carte produits", () => {
  const catalog = [
    {
      id: "s1",
      title: "Pizzas",
      items: [{ id: "a", name: "Margherita", note: "", details: "tomate, mozzarella", priceCents: 990 }],
    },
  ];
  const catalogField: ConfigField = {
    key: "productCatalog",
    label: "Menu / catalogue de produits",
    type: "textarea",
    required: true,
    showIf: { key: "objectives", includes: "order" },
  };
  const ordering = {
    status: "CONFIGURING" as const,
    externalPhoneNumber: "+33123456789",
    calendarConnected: false,
    whatsappConnected: false,
    facebookConnected: false,
    instagramConnected: false,
    configuration: { objectives: ["order"] },
    service: { slug: "prise-rdv-telephone" },
  };

  it("ne bloque jamais l'enregistrement quand la carte est vide", () => {
    expect(findMissingRequiredField([catalogField], { objectives: ["order"] })).toBeUndefined();
  });

  it("réclame la carte une fois la solution payée, tant qu'elle ne contient aucun produit", () => {
    expect(needsProductCatalog(ordering)).toBe(true);
    expect(setupHint(ordering)).toBe("Ajoutez votre carte pour que l'IA prenne les commandes");
    expect(needsProductCatalog({ ...ordering, configuration: { objectives: ["order"], productCatalog: catalog } })).toBe(false);
    expect(needsProductCatalog({ ...ordering, status: "PENDING_PAYMENT" })).toBe(false);
    expect(needsProductCatalog({ ...ordering, configuration: { objectives: ["appointment"] } })).toBe(false);
  });

  it("accompagne chaque blocage d'un intitulé d'action pour le bouton", () => {
    expect(setupAction(ordering)).toEqual({
      hint: "Ajoutez votre carte pour que l'IA prenne les commandes",
      cta: "Ajouter ma carte",
    });
    expect(setupAction({ ...ordering, externalPhoneNumber: null })?.cta).toBe(
      "Choisir un numéro"
    );
    expect(
      setupAction({
        ...ordering,
        configuration: { objectives: ["appointment"] },
      })?.cta
    ).toBe("Connecter mon agenda");
  });

  it("ne réclame rien quand tout est en place", () => {
    expect(
      setupAction({
        ...ordering,
        status: "ACTIVE",
        calendarConnected: true,
        configuration: { objectives: [] },
      })
    ).toBeNull();
  });

  it("résume la carte au lieu de l'afficher en entier, même saisie en texte", () => {
    expect(formatConfigValue(catalog, "productCatalog")).toBe("1 produit");
    expect(formatConfigValue("Tiramisu — 5 €\nPanna cotta — 4 €", "productCatalog")).toBe("2 produits");
  });

  it("nettoie la carte avant l'enregistrement sans toucher aux autres réglages", () => {
    const cleaned = withCleanProductCatalog({
      objectives: ["order"],
      productCatalog: [{ id: "s", title: "", items: [{ id: "x", name: " ", note: "", details: "", priceCents: null }] }],
    });
    expect(cleaned).toEqual({ objectives: ["order"], productCatalog: [] });
    expect(withCleanProductCatalog({ objectives: ["order"] })).toEqual({ objectives: ["order"] });
  });

  it("donne la carte à l'agent vocal, ou lui interdit de prendre commande sans carte", () => {
    const options = { calendarConnected: false, companyName: "Chez Luigi" };
    const withCatalog = buildSystemPrompt("prise-rdv-telephone", { objectives: ["order"], productCatalog: catalog }, options);
    expect(withCatalog).toContain("Catalogue :\nPizzas\n- Margherita — 9,90 € : tomate, mozzarella");
    const withoutCatalog = buildSystemPrompt("prise-rdv-telephone", { objectives: ["order"] }, options);
    expect(withoutCatalog).toContain("ne prends aucune commande");
    expect(withoutCatalog).not.toContain("take_order");
  });
});
