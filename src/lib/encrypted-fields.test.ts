import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ENCRYPTED_FIELDS,
  ENCRYPTED_PREFIX,
  buildModelSchema,
  decryptResult,
  decryptToken,
  encryptToken,
  encryptWriteArgs,
  isEncrypted,
  modelsReachingEncrypted,
  resetFallbackWarningForTests,
  resolveTokenKey,
} from "./encrypted-fields";

const key = randomBytes(32);
const getKey = () => key;

// Extrait du schéma, sous la forme de Prisma.dmmf.datamodel.models.
const schema = buildModelSchema([
  {
    name: "ClientService",
    fields: [
      { name: "id", kind: "scalar", type: "String" },
      { name: "whatsappAccessToken", kind: "scalar", type: "String" },
      { name: "instagramAccessToken", kind: "scalar", type: "String" },
      { name: "calendarConnection", kind: "object", type: "CalendarConnection" },
      { name: "bookings", kind: "object", type: "Booking" },
    ],
  },
  {
    name: "CalendarConnection",
    fields: [
      { name: "accessToken", kind: "scalar", type: "String" },
      { name: "refreshToken", kind: "scalar", type: "String" },
      { name: "clientService", kind: "object", type: "ClientService" },
    ],
  },
  {
    name: "Booking",
    fields: [
      { name: "clientService", kind: "object", type: "ClientService" },
    ],
  },
  {
    name: "SchedulingConnection",
    fields: [{ name: "encryptedToken", kind: "scalar", type: "String" }],
  },
]);

describe("encryptToken / decryptToken", () => {
  it("fait l'aller-retour sans laisser le jeton lisible", () => {
    const sealed = encryptToken("EAAG-jeton-meta", key);
    expect(sealed.startsWith(ENCRYPTED_PREFIX)).toBe(true);
    expect(sealed).not.toContain("EAAG-jeton-meta");
    expect(decryptToken(sealed, key)).toBe("EAAG-jeton-meta");
  });

  it("chiffre différemment deux fois le même jeton", () => {
    expect(encryptToken("x", key)).not.toBe(encryptToken("x", key));
  });

  it("reconnaît le préfixe", () => {
    expect(isEncrypted(encryptToken("x", key))).toBe(true);
    expect(isEncrypted("ya29.jeton-google")).toBe(false);
  });

  it("rend tel quel un jeton encore en clair", () => {
    expect(decryptToken("ya29.jeton-google", key)).toBe("ya29.jeton-google");
  });

  it("ne chiffre jamais deux fois", () => {
    const sealed = encryptToken("jeton", key);
    expect(encryptToken(sealed, key)).toBe(sealed);
  });

  it("échoue clairement avec une autre clé", () => {
    const sealed = encryptToken("jeton", key);
    expect(() => decryptToken(sealed, randomBytes(32))).toThrow(/TOKEN_ENCRYPTION_KEY a changé/);
  });

  it("refuse une valeur altérée ou mal formée", () => {
    const sealed = encryptToken("jeton", key);
    expect(() => decryptToken(sealed.slice(0, -4) + "AAAA", key)).toThrow();
    expect(() => decryptToken(`${ENCRYPTED_PREFIX}abc`, key)).toThrow("mal formé");
  });
});

describe("resolveTokenKey", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetFallbackWarningForTests();
  });

  it("lit une clé de 32 octets en base64", () => {
    const raw = randomBytes(32);
    expect(resolveTokenKey({ TOKEN_ENCRYPTION_KEY: raw.toString("base64") }).equals(raw)).toBe(true);
  });

  it("refuse une clé de mauvaise taille", () => {
    expect(() => resolveTokenKey({ TOKEN_ENCRYPTION_KEY: "dHJvcC1jb3VydGU=" })).toThrow(/32 octets/);
  });

  it("l'exige en production", () => {
    expect(() =>
      resolveTokenKey({ VERCEL_ENV: "production", BETTER_AUTH_SECRET: "s".repeat(32) })
    ).toThrow(/manquante en production/);
  });

  it("se rabat hors production sur BETTER_AUTH_SECRET, avec un avertissement", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const a = resolveTokenKey({ BETTER_AUTH_SECRET: "secret-a" });
    expect(a).toHaveLength(32);
    expect(resolveTokenKey({ BETTER_AUTH_SECRET: "secret-a" }).equals(a)).toBe(true);
    expect(resolveTokenKey({ BETTER_AUTH_SECRET: "secret-b" }).equals(a)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("encryptWriteArgs", () => {
  it("chiffre les champs d'un create sans toucher les autres ni l'objet d'origine", () => {
    const args = { data: { id: "cs1", whatsappAccessToken: "tok", instagramAccessToken: null } };
    const out = encryptWriteArgs(schema, "ClientService", "create", args, getKey);
    expect(isEncrypted(out.data.whatsappAccessToken)).toBe(true);
    expect(out.data.instagramAccessToken).toBeNull();
    expect(out.data.id).toBe("cs1");
    expect(args.data.whatsappAccessToken).toBe("tok");
  });

  it("chiffre les deux branches d'un upsert et la forme { set }", () => {
    const out = encryptWriteArgs(
      schema,
      "CalendarConnection",
      "upsert",
      {
        where: { clientServiceId: "cs1" },
        create: { accessToken: "a", refreshToken: "r" },
        update: { accessToken: { set: "a2" } },
      },
      getKey
    );
    expect(decryptToken(out.create.accessToken, key)).toBe("a");
    expect(decryptToken(out.create.refreshToken, key)).toBe("r");
    expect(decryptToken(out.update.accessToken.set, key)).toBe("a2");
  });

  it("chiffre createMany et les écritures imbriquées", () => {
    const many = encryptWriteArgs(
      schema,
      "CalendarConnection",
      "createMany",
      { data: [{ accessToken: "a" }, { accessToken: "b" }] },
      getKey
    );
    expect(many.data.every((d) => isEncrypted(d.accessToken))).toBe(true);

    const nested = encryptWriteArgs(
      schema,
      "ClientService",
      "update",
      {
        where: { id: "cs1" },
        data: { calendarConnection: { upsert: { create: { accessToken: "c" }, update: { refreshToken: "u" } } } },
      },
      getKey
    );
    const upsert = nested.data.calendarConnection.upsert;
    expect(decryptToken(upsert.create.accessToken, key)).toBe("c");
    expect(decryptToken(upsert.update.refreshToken, key)).toBe("u");
  });

  it("ne rechiffre pas une valeur déjà chiffrée et ignore les lectures", () => {
    const sealed = encryptToken("tok", key);
    const out = encryptWriteArgs(
      schema,
      "ClientService",
      "updateMany",
      { data: { whatsappAccessToken: sealed } },
      getKey
    );
    expect(out.data.whatsappAccessToken).toBe(sealed);
    const read = { where: { id: "x" } };
    expect(encryptWriteArgs(schema, "ClientService", "findUnique", read, getKey)).toBe(read);
  });

  it("ne touche pas aux champs d'un modèle non concerné", () => {
    const args = { data: { encryptedToken: "v1:deja-scelle" } };
    const out = encryptWriteArgs(schema, "SchedulingConnection", "create", args, getKey);
    expect(out.data.encryptedToken).toBe("v1:deja-scelle");
  });
});

describe("decryptResult", () => {
  it("déchiffre les résultats et les relations incluses, laisse le clair tel quel", () => {
    const rows = [
      {
        id: "b1",
        clientService: {
          whatsappAccessToken: encryptToken("w", key),
          instagramAccessToken: "ig-en-clair",
          calendarConnection: { accessToken: encryptToken("a", key), refreshToken: null },
        },
      },
    ];
    decryptResult(schema, "Booking", rows, getKey);
    expect(rows[0].clientService.whatsappAccessToken).toBe("w");
    expect(rows[0].clientService.instagramAccessToken).toBe("ig-en-clair");
    expect(rows[0].clientService.calendarConnection.accessToken).toBe("a");
  });

  it("ne demande pas la clé quand rien n'est chiffré", () => {
    const noKey = () => {
      throw new Error("clé demandée");
    };
    expect(() =>
      decryptResult(schema, "ClientService", { whatsappAccessToken: "clair" }, noKey)
    ).not.toThrow();
    expect(() => decryptResult(schema, "ClientService", null, noKey)).not.toThrow();
  });
});

describe("decryptResult : jeton illisible", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetFallbackWarningForTests();
  });

  it("renvoie null au lieu de lever, et journalise une fois par champ sans le jeton", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const other = randomBytes(32);
    const rows = [
      { whatsappAccessToken: encryptToken("secret-1", other), instagramAccessToken: encryptToken("ig", key) },
      { whatsappAccessToken: encryptToken("secret-2", other), instagramAccessToken: "clair" },
    ];
    expect(() => decryptResult(schema, "ClientService", rows, getKey)).not.toThrow();
    expect(rows[0].whatsappAccessToken).toBeNull();
    expect(rows[1].whatsappAccessToken).toBeNull();
    expect(rows[0].instagramAccessToken).toBe("ig");
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain("ClientService.whatsappAccessToken");
    expect(String(error.mock.calls[0][0])).not.toContain("secret");
  });

  it("renvoie null aussi quand la clé elle-même est introuvable", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const row = { calendarConnection: { accessToken: encryptToken("a", key) } };
    const noKey = () => {
      throw new Error("TOKEN_ENCRYPTION_KEY manquante");
    };
    expect(() => decryptResult(schema, "ClientService", row, noKey)).not.toThrow();
    expect(row.calendarConnection.accessToken).toBeNull();
  });
});

describe("decryptResult : parcours limité", () => {
  it("ne lit ni les champs ordinaires ni les relations sans jeton", () => {
    const row: Record<string, unknown> = { whatsappAccessToken: "clair" };
    for (const name of ["id", "notes", "organization"]) {
      Object.defineProperty(row, name, {
        enumerable: true,
        get() {
          throw new Error(`champ ${name} lu`);
        },
      });
    }
    expect(() => decryptResult(schema, "ClientService", row, getKey)).not.toThrow();
  });

  it("ne descend que dans les relations qui mènent à un champ chiffré", () => {
    expect([...schema.ClientService.descend.keys()].sort()).toEqual(["bookings", "calendarConnection"]);
    expect([...schema.SchedulingConnection.descend.keys()]).toEqual([]);
  });
});

describe("ENCRYPTED_FIELDS", () => {
  it("laisse la table Account à better-auth (encryptOAuthTokens)", () => {
    expect(ENCRYPTED_FIELDS).not.toHaveProperty("Account");
  });
});

describe("modelsReachingEncrypted", () => {
  it("retient les modèles qui portent ou incluent un champ chiffré", () => {
    const reaching = modelsReachingEncrypted(schema);
    expect([...reaching].sort()).toEqual(["Booking", "CalendarConnection", "ClientService"]);
  });
});
