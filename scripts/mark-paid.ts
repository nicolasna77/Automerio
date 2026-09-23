// Passe toutes les prestations non résiliées d'un utilisateur en ACTIVE,
// pour prévisualiser le dashboard sans repasser par un vrai paiement Stripe.
//
// Usage : npx tsx scripts/mark-paid.ts <email>

import { config } from "dotenv";
config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/mark-paid.ts <email>");
    process.exit(1);
  }

  const user = await db.user.findUniqueOrThrow({ where: { email } });

  const { count } = await db.clientService.updateMany({
    where: { userId: user.id, status: { not: "CANCELED" } },
    data: { status: "ACTIVE", activatedAt: new Date() },
  });

  console.log(`${count} prestation(s) passée(s) en ACTIVE pour ${email}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
