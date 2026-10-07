import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Chiffrement transparent des jetons de tiers gardés en base (WhatsApp,
// Messenger, Instagram, Google Agenda) : une fuite de la base ne doit pas
// donner accès aux comptes des clients. Les jetons de connexion Google de la
// table Account sont chiffrés par better-auth lui-même
// (`account.encryptOAuthTokens`), pas par ce module.
//
// AES-256-GCM, valeur stockée sous la forme `enc:v1:<iv>:<tag>:<chiffré>`
// (base64url). Le préfixe permet de lire telle quelle une valeur encore en
// clair (pas encore migrée) et de ne jamais chiffrer deux fois.
//
// Ce module ne dépend pas de Prisma : `src/lib/db.ts` branche ces fonctions
// sur le client via une extension, en lui passant la description du schéma.

export const ENCRYPTED_PREFIX = "enc:v1:";

// Champs chiffrés, par modèle Prisma. Ajouter un champ ici suffit : lectures
// et écritures passent par l'extension de `db`, puis lancer
// `scripts/encrypt-integration-tokens.ts` pour chiffrer l'existant.
export const ENCRYPTED_FIELDS: Readonly<Record<string, readonly string[]>> = {
  ClientService: ["whatsappAccessToken", "facebookPageAccessToken", "instagramAccessToken"],
  CalendarConnection: ["accessToken", "refreshToken"],
};

type Source = Record<string, string | undefined>;

let warnedFallback = false;

export class TokenEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenEncryptionError";
  }
}

export function resolveTokenKey(source: Source = process.env): Buffer {
  const raw = source.TOKEN_ENCRYPTION_KEY?.trim();
  if (raw) {
    const key = Buffer.from(raw, "base64");
    if (key.length !== 32) {
      throw new TokenEncryptionError(
        `TOKEN_ENCRYPTION_KEY doit faire 32 octets encodés en base64 (reçu ${key.length} octets). ` +
          "Générez-en une avec `openssl rand -base64 32`."
      );
    }
    return key;
  }
  if (source.VERCEL_ENV === "production") {
    throw new TokenEncryptionError(
      "TOKEN_ENCRYPTION_KEY manquante en production : les jetons des intégrations ne peuvent être ni chiffrés ni lus. " +
        "Générez-en une avec `openssl rand -base64 32`."
    );
  }
  const secret = source.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new TokenEncryptionError(
      "Ni TOKEN_ENCRYPTION_KEY ni BETTER_AUTH_SECRET : impossible de chiffrer les jetons des intégrations."
    );
  }
  if (!warnedFallback) {
    warnedFallback = true;
    console.warn(
      "[encrypted-fields] TOKEN_ENCRYPTION_KEY absente : clé dérivée de BETTER_AUTH_SECRET (acceptable hors production uniquement)."
    );
  }
  return createHash("sha256").update(`token-encryption:${secret}`).digest();
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptToken(plain: string, key: Buffer = resolveTokenKey()): string {
  if (isEncrypted(plain)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENCRYPTED_PREFIX + [iv, tag, encrypted].map((b) => b.toString("base64url")).join(":");
}

export function decryptToken(stored: string, key: Buffer = resolveTokenKey()): string {
  if (!isEncrypted(stored)) return stored;
  const [iv, tag, encrypted] = stored.slice(ENCRYPTED_PREFIX.length).split(":");
  if (!iv || !tag || encrypted === undefined) {
    throw new TokenEncryptionError("Jeton chiffré mal formé");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new TokenEncryptionError(
      "Impossible de déchiffrer un jeton d'intégration : TOKEN_ENCRYPTION_KEY a changé ou la valeur a été altérée."
    );
  }
}

// --- Parcours des arguments et des résultats Prisma -------------------------

// Pour chaque modèle : ses champs chiffrés, ses relations (champ -> modèle
// cible) et, parmi elles, celles qui mènent à un champ chiffré (`descend`) :
// seules ces dernières sont parcourues à la lecture. Construit depuis
// `Prisma.dmmf` dans db.ts, à la main dans les tests.
export type ModelDef = {
  encrypted: ReadonlySet<string>;
  relations: ReadonlyMap<string, string>;
  descend: ReadonlyMap<string, string>;
};
export type ModelSchema = Record<string, ModelDef>;

type DmmfModel = {
  name: string;
  fields: readonly { name: string; kind: string; type: string }[];
};

export function buildModelSchema(models: readonly DmmfModel[]): ModelSchema {
  const base: Record<string, Omit<ModelDef, "descend">> = {};
  for (const model of models) {
    base[model.name] = {
      encrypted: new Set(ENCRYPTED_FIELDS[model.name] ?? []),
      relations: new Map(
        model.fields.filter((f) => f.kind === "object").map((f) => [f.name, f.type])
      ),
    };
  }
  const reaching = reachingModels(base);
  const schema: ModelSchema = {};
  for (const [name, def] of Object.entries(base)) {
    schema[name] = {
      ...def,
      descend: new Map([...def.relations].filter(([, target]) => reaching.has(target))),
    };
  }
  return schema;
}

// Modèles depuis lesquels un champ chiffré est atteignable (directement ou par
// une relation incluse) : les autres requêtes ne sont pas parcourues.
export function modelsReachingEncrypted(schema: ModelSchema): Set<string> {
  return reachingModels(schema);
}

function reachingModels(schema: Record<string, Omit<ModelDef, "descend">>): Set<string> {
  const reaching = new Set(
    Object.keys(schema).filter((name) => schema[name].encrypted.size > 0)
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, model] of Object.entries(schema)) {
      if (reaching.has(name)) continue;
      if ([...model.relations.values()].some((target) => reaching.has(target))) {
        reaching.add(name);
        changed = true;
      }
    }
  }
  return reaching;
}

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function eachItem(value: unknown, fn: (item: Obj) => void): void {
  if (Array.isArray(value)) value.forEach((item) => isObj(item) && fn(item));
  else if (isObj(value)) fn(value);
}

function encryptFieldValue(value: unknown, key: () => Buffer): unknown {
  if (typeof value === "string") return isEncrypted(value) ? value : encryptToken(value, key());
  // `update` accepte aussi { set: "..." }
  if (isObj(value) && typeof value.set === "string") {
    return { ...value, set: isEncrypted(value.set) ? value.set : encryptToken(value.set, key()) };
  }
  return value;
}

// Chiffre les champs d'un objet `data` (création ou mise à jour), y compris
// dans les écritures imbriquées (create, createMany, connectOrCreate, upsert,
// update, updateMany sur une relation). Renvoie une copie, l'objet de
// l'appelant n'est pas modifié.
export function encryptData(schema: ModelSchema, model: string, data: Obj, key: () => Buffer): Obj {
  const def = schema[model];
  if (!def) return data;
  const out: Obj = { ...data };
  for (const [field, value] of Object.entries(data)) {
    if (def.encrypted.has(field)) {
      out[field] = encryptFieldValue(value, key);
    } else if (def.relations.has(field) && isObj(value)) {
      out[field] = encryptNestedWrites(schema, def.relations.get(field)!, value, key);
    }
  }
  return out;
}

function mapItems(value: unknown, fn: (item: Obj) => Obj): unknown {
  if (Array.isArray(value)) return value.map((item) => (isObj(item) ? fn(item) : item));
  return isObj(value) ? fn(value) : value;
}

function encryptNestedWrites(schema: ModelSchema, model: string, ops: Obj, key: () => Buffer): Obj {
  const data = (d: Obj) => encryptData(schema, model, d, key);
  const withData = (item: Obj) =>
    isObj(item.data) ? { ...item, data: data(item.data) } : item;
  const hasDataField = schema[model]?.encrypted.has("data") || schema[model]?.relations.has("data");
  const out: Obj = { ...ops };
  for (const [op, value] of Object.entries(ops)) {
    switch (op) {
      case "create":
        out[op] = mapItems(value, data);
        break;
      case "createMany":
        out[op] = isObj(value) ? { ...value, data: mapItems(value.data, data) } : value;
        break;
      case "connectOrCreate":
        out[op] = mapItems(value, (item) =>
          isObj(item.create) ? { ...item, create: data(item.create) } : item
        );
        break;
      case "upsert":
        out[op] = mapItems(value, (item) => ({
          ...item,
          ...(isObj(item.create) ? { create: data(item.create) } : {}),
          ...(isObj(item.update) ? { update: data(item.update) } : {}),
        }));
        break;
      case "update":
        // Relation 1-n : { where, data } ; relation 1-1 : les données
        // directement, ou { where?, data }.
        out[op] = mapItems(value, (item) =>
          isObj(item.data) && !hasDataField ? withData(item) : data(item)
        );
        break;
      case "updateMany":
        out[op] = mapItems(value, withData);
        break;
    }
  }
  return out;
}

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
]);

// Transforme les arguments d'une opération Prisma de premier niveau.
export function encryptWriteArgs<T>(
  schema: ModelSchema,
  model: string,
  operation: string,
  args: T,
  key: () => Buffer
): T {
  if (!WRITE_OPERATIONS.has(operation) || !isObj(args)) return args;
  const out: Obj = { ...args };
  const data = (d: Obj) => encryptData(schema, model, d, key);
  if (operation === "upsert") {
    if (isObj(args.create)) out.create = data(args.create);
    if (isObj(args.update)) out.update = data(args.update);
  } else {
    out.data = mapItems(args.data, data);
  }
  return out as T;
}

// Déchiffre, en place, les champs chiffrés d'un résultat (et des relations
// incluses). Les valeurs encore en clair sont laissées telles quelles.
//
// Seuls les champs chiffrés et les relations menant à un champ chiffré
// (`descend`) présents dans la ligne sont visités : le coût ne dépend pas de la
// largeur des lignes ni des relations sans jeton.
//
// Un jeton indéchiffrable (clé changée ou absente, préview partageant la base
// avec une autre clé, valeur altérée) est rendu `null` : l'intégration apparaît
// déconnectée au lieu de faire échouer toute requête qui touche la ligne
// (tableaux de bord, webhooks, connexion). L'erreur est journalisée une fois
// par modèle et champ, sans le contenu du jeton. L'écriture, elle, continue de
// lever : un jeton ne doit jamais être stocké en clair faute de clé.
export function decryptResult(schema: ModelSchema, model: string, result: unknown, key: () => Buffer): void {
  const def = schema[model];
  if (!def || result === null || typeof result !== "object") return;
  if (def.encrypted.size === 0 && def.descend.size === 0) return;
  eachItem(result, (row) => {
    for (const field of def.encrypted) {
      const value = row[field];
      if (typeof value !== "string" || !isEncrypted(value)) continue;
      try {
        row[field] = decryptToken(value, key());
      } catch (err) {
        row[field] = null;
        reportDecryptFailure(model, field, err);
      }
    }
    for (const [field, target] of def.descend) {
      const value = row[field];
      if (value !== null && typeof value === "object") decryptResult(schema, target, value, key);
    }
  });
}

const reportedFailures = new Set<string>();

function reportDecryptFailure(model: string, field: string, err: unknown): void {
  const id = `${model}.${field}`;
  if (reportedFailures.has(id)) return;
  reportedFailures.add(id);
  const reason = err instanceof TokenEncryptionError ? err.message : "erreur inattendue";
  console.error(`[encrypted-fields] ${id} illisible, renvoyé à null (intégration vue comme déconnectée) : ${reason}`);
}

// Test-only : réarme l'avertissement de clé de repli et les erreurs de lecture.
export function resetFallbackWarningForTests(): void {
  warnedFallback = false;
  reportedFailures.clear();
}
