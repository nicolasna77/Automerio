// Chiffre les jetons d'intégration encore stockés en clair (voir
// ENCRYPTED_FIELDS dans src/lib/encrypted-fields.ts).
//
//   npx tsx scripts/encrypt-integration-tokens.ts --dry-run   # compte seulement
//   npx tsx scripts/encrypt-integration-tokens.ts             # chiffre
//   npx tsx scripts/encrypt-integration-tokens.ts --decrypt-account [--dry-run]
//
// `--decrypt-account` (ponctuel) : remet en clair les jetons de la table Account
// qu'une version précédente avait chiffrés au format `enc:v1:` ; ces jetons
// sont désormais chiffrés par better-auth (`account.encryptOAuthTokens`), qui
// ne sait pas lire ce format. À lancer une fois par base, avec la clé qui a
// servi à les chiffrer.
//
// Idempotent : une valeur déjà préfixée `enc:v1:` est ignorée. Chaque ligne est
// mise à jour à condition que ses jetons n'aient pas changé entre-temps : une
// écriture concurrente de l'application (déjà chiffrée par `db`) n'est jamais
// écrasée. Utilise un client Prisma sans l'extension, pour voir les valeurs
// telles qu'elles sont en base. La clé est lue comme dans l'application
// (TOKEN_ENCRYPTION_KEY, sinon dérivée de BETTER_AUTH_SECRET hors production) :
// lancez-le avec les variables d'environnement de la cible.
import { config } from "dotenv";
config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ENCRYPTED_FIELDS,
  decryptToken,
  encryptToken,
  isEncrypted,
  resolveTokenKey,
} from "../src/lib/encrypted-fields";

const BATCH_SIZE = 200;
const dryRun = process.argv.includes("--dry-run");
const decryptAccount = process.argv.includes("--decrypt-account");
const ACCOUNT_TOKEN_FIELDS = ["accessToken", "refreshToken", "idToken"] as const;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type Row = Record<string, string | null>;
type Delegate = {
  findMany(args: {
    select: Record<string, true>;
    orderBy: { id: "asc" };
    take: number;
    where?: { id: { gt: string } };
  }): Promise<Row[]>;
  updateMany(args: { where: Record<string, unknown>; data: Record<string, string> }): Promise<{ count: number }>;
};

function delegateFor(model: string): Delegate {
  const name = model[0].toLowerCase() + model.slice(1);
  return (prisma as unknown as Record<string, Delegate>)[name];
}

type Transform = { label: string; select: (value: string) => boolean; apply: (value: string) => string };

async function encryptModel(model: string, fields: readonly string[], key: Buffer) {
  await transformModel(model, fields, {
    label: "chiffrée(s)",
    select: (value) => !isEncrypted(value),
    apply: (value) => encryptToken(value, key),
  });
}

async function transformModel(model: string, fields: readonly string[], transform: Transform) {
  const delegate = delegateFor(model);
  const select = Object.fromEntries([["id", true], ...fields.map((f) => [f, true])]) as Record<string, true>;
  let lastId: string | undefined;
  let scanned = 0;
  let toProcess = 0;
  let updated = 0;
  let conflicts = 0;

  for (;;) {
    const rows = await delegate.findMany({
      select,
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(lastId ? { where: { id: { gt: lastId } } } : {}),
    });
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].id!;
    scanned += rows.length;

    for (const row of rows) {
      const pending = fields.filter((f) => {
        const value = row[f];
        return typeof value === "string" && value !== "" && transform.select(value);
      });
      if (pending.length === 0) continue;
      toProcess++;
      if (dryRun) continue;

      const where: Record<string, unknown> = { id: row.id };
      const data: Record<string, string> = {};
      for (const f of pending) {
        where[f] = row[f];
        data[f] = transform.apply(row[f]!);
      }
      const { count } = await delegate.updateMany({ where, data });
      if (count === 1) updated++;
      else conflicts++;
    }
  }

  console.log(
    `${model} : ${scanned} ligne(s) parcourue(s), ${toProcess} à traiter` +
      (dryRun
        ? " (simulation, rien n'est écrit)"
        : `, ${updated} ${transform.label}, ${conflicts} modifiée(s) entre-temps (relancer)`)
  );
}

async function main() {
  const key = resolveTokenKey();
  if (decryptAccount) {
    await transformModel("Account", ACCOUNT_TOKEN_FIELDS, {
      label: "remise(s) en clair",
      select: isEncrypted,
      apply: (value) => decryptToken(value, key),
    });
    return;
  }
  for (const [model, fields] of Object.entries(ENCRYPTED_FIELDS)) {
    await encryptModel(model, fields, key);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
