import { config } from "dotenv";
config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CATALOG, catalogSyncFields } from "../src/lib/catalog-data";
import { slugify } from "../src/lib/utils";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const DEMO_PASSWORD = "password123";

type FakeClient = {
  name: string;
  email: string;
  company: string;
  subscriptions: {
    slug: string;
    name: string;
    status: "PENDING_PAYMENT" | "CONFIGURING" | "ACTIVE" | "CANCELED";
    configuration?: Record<string, string | string[]>;
    adminNote?: string;
    daysAgo: number;
  }[];
};

const FAKE_CLIENTS: FakeClient[] = [
  {
    name: "Marc Lefèvre",
    email: "marc.lefevre@example.com",
    company: "Plomberie Lefèvre",
    subscriptions: [
      {
        slug: "standard-telephonique-ia",
        name: "Standard téléphonique automatisé",
        status: "ACTIVE",
        configuration: {
          phoneLine: "+33 6 12 34 56 78",
          greetingMessage: "Bonjour, vous êtes bien chez Plomberie Lefèvre.",
        },
        daysAgo: 21,
      },
      {
        slug: "prise-rdv-telephone",
        name: "Prise de rendez-vous / commande par téléphone",
        status: "CONFIGURING",
        configuration: {
          objectives: ["appointment"],
          slotDuration: "30",
        },
        adminNote: "Connexion de votre agenda en cours — actif d'ici demain.",
        daysAgo: 3,
      },
    ],
  },
  {
    name: "Sophie Dubreuil",
    email: "sophie.dubreuil@example.com",
    company: "Coaching Sportif SD",
    subscriptions: [
      {
        slug: "assistant-whatsapp",
        name: "Réponses automatiques sur WhatsApp",
        status: "PENDING_PAYMENT",
        configuration: {
          whatsappNumber: "+33 6 98 76 54 32",
        },
        daysAgo: 0,
      },
    ],
  },
  {
    name: "Karim Haddad",
    email: "karim.haddad@example.com",
    company: "Pizzeria Karim",
    subscriptions: [
      {
        slug: "prise-rdv-telephone",
        name: "Prise de commande par téléphone",
        status: "ACTIVE",
        configuration: {
          objectives: ["order"],
          productCatalog:
            "Pizza Margherita — 9,50 €\nPizza Reine — 11,50 €\nPizza 4 Fromages — 12,50 €",
          businessAddress: "4 place du Marché, 31000 Toulouse",
          deliveryZone: "Toulouse centre, dans un rayon de 5 km",
        },
        daysAgo: 45,
      },
      {
        slug: "reponses-emails",
        name: "Réponses automatiques aux e-mails",
        status: "CANCELED",
        configuration: {
          mailbox: "contact@pizzeria-karim.fr",
        },
        daysAgo: 60,
      },
    ],
  },
  {
    name: "Élise Moreau",
    email: "elise.moreau@example.com",
    company: "Cabinet Moreau Conseil",
    subscriptions: [
      {
        slug: "prise-rdv-automatique",
        name: "Prise de rendez-vous automatique",
        status: "CONFIGURING",
        configuration: {
          calendarLink: "https://calendly.com/cabinet-moreau",
          slotDuration: "45",
        },
        adminNote: "Vérification de la synchronisation de votre agenda.",
        daysAgo: 1,
      },
    ],
  },
];

async function main() {
  const { auth } = await import("../src/lib/auth");

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

  const serviceIdBySlug = new Map(services.map((s) => [s.slug, s.id]));

  const adminEmail = "equipe@automerio.test";
  const legacyAdminEmail = "equipe@noveris.test";
  if (!(await db.user.findUnique({ where: { email: adminEmail } }))) {
    const legacyAdmin = await db.user.findUnique({
      where: { email: legacyAdminEmail },
    });
    if (legacyAdmin) {
      await db.user.update({
        where: { id: legacyAdmin.id },
        data: { email: adminEmail, name: "Équipe Automerio" },
      });
      console.log(`Admin renommé : ${legacyAdminEmail} → ${adminEmail}`);
    } else {
      const result = await auth.api.signUpEmail({
        body: { name: "Équipe Automerio", email: adminEmail, password: DEMO_PASSWORD },
      });
      await db.user.update({
        where: { id: result.user.id },
        data: { role: "ADMIN", emailVerified: true },
      });
      console.log(`Admin créé : ${adminEmail} (mot de passe : ${DEMO_PASSWORD})`);
    }
  }

  for (const client of FAKE_CLIENTS) {
    let user = await db.user.findUnique({ where: { email: client.email } });

    if (!user) {
      const result = await auth.api.signUpEmail({
        body: {
          name: client.name,
          email: client.email,
          password: DEMO_PASSWORD,
        },
      });
      user = await db.user.update({
        where: { id: result.user.id },
        data: { emailVerified: true },
      });
      console.log(`Client créé : ${client.email} (mot de passe : ${DEMO_PASSWORD})`);
    }

    let organization = await db.organization.findFirst({
      where: { members: { some: { userId: user.id } } },
    });
    if (!organization) {
      const created = await auth.api.createOrganization({
        body: {
          name: client.company,
          slug: slugify(client.company),
          userId: user.id,
        },
      });
      if (!created) throw new Error(`Échec de création de l'organisation pour ${client.email}`);
      organization = await db.organization.findUniqueOrThrow({ where: { id: created.id } });
      console.log(`Organisation créée : ${client.company}`);
    }

    for (const sub of client.subscriptions) {
      const serviceId = serviceIdBySlug.get(sub.slug);
      if (!serviceId) {
        console.warn(`Service introuvable pour le slug « ${sub.slug} », ignoré.`);
        continue;
      }

      const createdAt = new Date(Date.now() - sub.daysAgo * 24 * 60 * 60 * 1000);
      const activatedAt = sub.status === "ACTIVE" ? createdAt : null;
      const canceledAt = sub.status === "CANCELED" ? new Date() : null;

      await db.clientService.upsert({
        where: {
          organizationId_serviceId_name: {
            organizationId: organization.id,
            serviceId,
            name: sub.name,
          },
        },
        create: {
          userId: user.id,
          organizationId: organization.id,
          serviceId,
          name: sub.name,
          status: sub.status,
          configuration: sub.configuration ?? {},
          adminNote: sub.adminNote ?? null,
          createdAt,
          activatedAt,
          canceledAt,
        },
        update: {
          status: sub.status,
          configuration: sub.configuration ?? {},
          adminNote: sub.adminNote ?? null,
          activatedAt,
          canceledAt,
        },
      });
    }
  }

  console.log(`${FAKE_CLIENTS.length} faux clients synchronisés.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
