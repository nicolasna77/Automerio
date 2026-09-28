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
