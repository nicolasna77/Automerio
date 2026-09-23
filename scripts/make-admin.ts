// Attribue le rôle ADMIN à un utilisateur existant, identifié par e-mail.
// Le rôle ne peut jamais être choisi à l'inscription : seul cet accès direct
// à la base permet de créer un administrateur.
//
// Usage : npx tsx scripts/make-admin.ts admin@automerio.fr

import { config } from "dotenv";
config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/make-admin.ts <email>");
    process.exit(1);
  }

  const user = await db.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`${user.email} est désormais ADMIN.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
