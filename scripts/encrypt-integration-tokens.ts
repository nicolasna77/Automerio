// Chiffre les jetons d'intégration encore stockés en clair (voir
// ENCRYPTED_FIELDS dans src/lib/encrypted-fields.ts).
//
//   npx tsx scripts/encrypt-integration-tokens.ts --dry-run   # compte seulement
//   npx tsx scripts/encrypt-integration-tokens.ts             # chiffre
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
  encryptToken,
  isEncrypted,
  resolveTokenKey,
} from "../src/lib/encrypted-fields";

const BATCH_SIZE = 200;
const dryRun = process.argv.includes("--dry-run");

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

async function encryptModel(model: string, fields: readonly string[], key: Buffer) {
  const delegate = delegateFor(model);
  const select = Object.fromEntries([["id", true], ...fields.map((f) => [f, true])]) as Record<string, true>;
  let lastId: string | undefined;
  let scanned = 0;
  let toEncrypt = 0;
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
      const plain = fields.filter((f) => {
        const value = row[f];
        return typeof value === "string" && value !== "" && !isEncrypted(value);
      });
      if (plain.length === 0) continue;
      toEncrypt++;
      if (dryRun) continue;

      const where: Record<string, unknown> = { id: row.id };
      const data: Record<string, string> = {};
      for (const f of plain) {
        where[f] = row[f];
        data[f] = encryptToken(row[f]!, key);
      }
      const { count } = await delegate.updateMany({ where, data });
      if (count === 1) updated++;
      else conflicts++;
    }
  }

  console.log(
    `${model} : ${scanned} ligne(s) parcourue(s), ${toEncrypt} avec un jeton en clair` +
      (dryRun ? " (simulation, rien n'est écrit)" : `, ${updated} chiffrée(s), ${conflicts} modifiée(s) entre-temps (relancer)`)
  );
}

async function main() {
  const key = resolveTokenKey();
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
