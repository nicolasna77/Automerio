import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  buildModelSchema,
  decryptResult,
  encryptWriteArgs,
  modelsReachingEncrypted,
  resolveTokenKey,
} from "@/lib/encrypted-fields";

// Les jetons de tiers (voir ENCRYPTED_FIELDS dans encrypted-fields.ts) sont
// chiffrés à l'écriture et déchiffrés à la lecture par l'extension ci-dessous,
// relations incluses : le reste du code les lit et les écrit en clair. Un
// filtre `where` sur l'un de ces champs ne trouverait rien, et $queryRaw les
// renvoie chiffrés.
const schema = buildModelSchema(Prisma.dmmf.datamodel.models);
const reaching = modelsReachingEncrypted(schema);

let cachedKey: Buffer | undefined;
const tokenKey = () => (cachedKey ??= resolveTokenKey());

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter }).$extends({
    name: "encrypted-fields",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!reaching.has(model)) return query(args);
          const result = await query(encryptWriteArgs(schema, model, operation, args, tokenKey));
          decryptResult(schema, model, result, tokenKey);
          return result;
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
