// Synchronise le catalogue de prestations — et seulement lui.
//
// Version sûre pour la production de `prisma/seed.ts` : ne touche qu'à la table
// `Service`, sans jamais créer les faux clients de démonstration (mot de passe
// partagé « password123 ») que le seed de développement ajoute en plus.
//
// Ce qui est réécrit sur une solution déjà en base est décidé par
// `catalogSyncFields` : les colonnes que l'espace admin peut modifier sont
// laissées intactes, celles que seul le catalogue possède sont remises à jour.
//
// Usage : DATABASE_URL="<url de la vraie base>" npm run db:sync-catalog

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

  // Les solutions personnalisables sont annoncees : c'est leur absence qui
  // avait fait disparaitre le curseur de minutes du site sans rien signaler.
  const personnalisables = services.filter((s) => s.maxUsageUnits !== null);
  if (personnalisables.length === 0) {
    console.warn(
      "Aucune solution personnalisable : aucun curseur de quota ne s'affichera."
    );
    return;
  }
  for (const s of personnalisables) {
    console.log(
      `  curseur ${s.slug} : ${s.includedUsageUnits} → ${s.maxUsageUnits}, ` +
        `par pas de ${s.usageStepUnits}`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
