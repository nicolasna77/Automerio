// Version "sûre pour la prod" de prisma/seed.ts : ne synchronise QUE le
// catalogue de prestations (table Service), sans jamais créer les faux
// clients de démonstration (mot de passe partagé "password123") que
// prisma/seed.ts crée en plus pour le développement local.
//
// Ce qui est reecrit sur une solution deja en base est decide par
// `catalogSyncFields` : les colonnes que l'espace admin peut modifier sont
// laissees intactes, celles que seul le catalogue possede sont remises a jour.
//
// Usage : DATABASE_URL="<url de la vraie base de prod>" npm run db:sync-catalog

import { config } from "dotenv";
config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CATALOG, catalogSyncFields } from "../src/lib/catalog-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  const services = await Promise.all(
    CATALOG.map((service) =>
      db.service.upsert({
        where: { slug: service.slug },
        create: service,
        update: catalogSyncFields(service),
      })
    )
  );
  console.log(`Catalogue synchronisé : ${services.length} prestations.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
