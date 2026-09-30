import { config } from "dotenv";
config();
import { mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { chromium, type Page } from "playwright";
import sharp from "sharp";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const DEMO_EMAIL = "marc.lefevre@example.com";
const DEMO_PASSWORD = "password123";
const DEMO_PREFIX = "screenshot-demo-";
const OUT_DIR = "public/screenshots";
const DEMO_LINE = "+33199001234";

const DEMO_CALLS = [
  {
    minutesAgo: 35,
    durationSec: 94,
    fromNumber: "+33639980142",
    outcome: "transferred",
    callerName: "Julien Perrin",
    reason: "Fuite sous l'évier",
    summary: "Fuite active sous l'évier de la cuisine. L'appel a été transféré au technicien.",
    followUp: null,
  },
  {
    minutesAgo: 140,
    durationSec: 61,
    fromNumber: "+33639980267",
    outcome: "message_taken",
    callerName: "Claire Vasseur",
    reason: "Devis chauffe-eau",
    summary: "Souhaite un devis pour remplacer un chauffe-eau de 200 litres.",
    followUp: "Rappeler pour fixer une visite, de préférence le matin.",
  },
  {
    minutesAgo: 260,
    durationSec: 38,
    fromNumber: "+33639980318",
    outcome: "no_action",
    callerName: null,
    reason: "Horaires d'ouverture",
    summary: "A demandé les horaires du samedi. L'assistant a répondu.",
    followUp: null,
  },
  {
    minutesAgo: 60 * 22,
    durationSec: 122,
    fromNumber: "+33639980455",
    outcome: "message_taken",
    callerName: "Hugo Marchand",
    reason: "Robinet qui goutte",
    summary: "Robinet de salle de bain qui goutte depuis une semaine. Pas urgent.",
    followUp: "Rappeler pour proposer un créneau la semaine prochaine.",
  },
  {
    minutesAgo: 60 * 26,
    durationSec: 47,
    fromNumber: "+33639980521",
    outcome: "no_action",
    callerName: null,
    reason: "Zone d'intervention",
    summary: "Demande si l'entreprise intervient dans la commune voisine. L'assistant a confirmé.",
    followUp: null,
  },
  {
    minutesAgo: 60 * 49,
    durationSec: 83,
    fromNumber: "+33639980674",
    outcome: "transferred",
    callerName: "Nadia Benali",
    reason: "Canalisation bouchée",
    summary: "Évacuation de douche bouchée. L'appel a été transféré au technicien.",
    followUp: null,
  },
];

function assertLocal() {
  const url = new URL(BASE_URL);
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Ce script ne s'exécute que contre un serveur local.");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Ce script ne s'exécute pas en production.");
  }
}

async function seedDemoCalls(db: PrismaClient): Promise<string> {
  const user = await db.user.findUniqueOrThrow({ where: { email: DEMO_EMAIL } });
  const clientService = await db.clientService.findFirstOrThrow({
    where: { userId: user.id, status: "ACTIVE", service: { slug: "standard-telephonique-ia" } },
  });

  if (!clientService.externalPhoneNumber) {
    await db.clientService.update({
      where: { id: clientService.id },
      data: { externalPhoneNumber: DEMO_LINE },
    });
  }
  await db.usageEvent.deleteMany({ where: { externalId: { startsWith: DEMO_PREFIX } } });
  const now = Date.now();
  for (const [index, call] of DEMO_CALLS.entries()) {
    const occurredAt = new Date(now - call.minutesAgo * 60_000);
    await db.usageEvent.create({
      data: {
        clientServiceId: clientService.id,
        type: "call",
        status: "completed",
        occurredAt,
        endedAt: new Date(occurredAt.getTime() + call.durationSec * 1000),
        durationSec: call.durationSec,
        externalId: `${DEMO_PREFIX}${index}`,
        metadata: { fromNumber: call.fromNumber, outcome: call.outcome },
        callSummary: {
          create: {
            transcript: [],
            reason: call.reason,
            summary: call.summary,
            followUp: call.followUp,
            callerName: call.callerName,
          },
        },
      },
    });
  }
  return clientService.id;
}

type Clip = { x: number; y: number; width: number; height: number };

async function capture(page: Page, path: string, name: string, target: { cardHeading?: string; clip?: Clip }) {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.evaluate((value) => localStorage.setItem("theme", value), theme);
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    const { cardHeading, clip = { x: 0, y: 0, width: 1280, height: 800 } } = target;
    const png = cardHeading
      ? await page
          .getByRole("heading", { name: cardHeading, exact: true })
          .locator("xpath=ancestor::*[@data-slot='card'][1]")
          .screenshot()
      : await page.screenshot({ clip });
    await sharp(png).webp({ quality: 82 }).toFile(`${OUT_DIR}/${name}-${theme}.webp`);
    console.info(`capture : ${OUT_DIR}/${name}-${theme}.webp`);
  }
}

async function main() {
  assertLocal();
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const clientServiceId = await seedDemoCalls(db);
  await db.$disconnect();

  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel("E-mail").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe", { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await capture(page, "/dashboard", "dashboard-overview", { clip: { x: 256, y: 64, width: 1024, height: 640 } });
  await capture(page, `/dashboard/services/${clientServiceId}`, "dashboard-calls", { cardHeading: "Appels reçus" });
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
