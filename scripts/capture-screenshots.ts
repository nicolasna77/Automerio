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
  // Les appels doivent tomber dans le mois en cours, sinon la vue d'ensemble
  // affiche « 0 appel ce mois-ci » les premiers jours du mois.
  const today = new Date(now);
  const sinceMonthStart = now - new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const oldest = Math.max(...DEMO_CALLS.map((call) => call.minutesAgo)) * 60_000;
  const scale = oldest < sinceMonthStart ? 1 : Math.max((sinceMonthStart - 60_000) / oldest, 0.01);
  for (const [index, call] of DEMO_CALLS.entries()) {
    const occurredAt = new Date(now - call.minutesAgo * 60_000 * scale);
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
  await db.clientService.update({
    where: { id: clientService.id },
    data: {
      configuration: {
        ...(clientService.configuration as Record<string, unknown>),
        ...DEMO_SETTINGS,
      },
    },
  });
  return clientService.id;
}

const DEMO_SETTINGS = {
  greetingMessage: "Bonjour, vous êtes bien chez Plomberie Lefèvre. Je suis l'assistant virtuel de l'entreprise.",
  openingHours: {
    mon: { closed: false, open: "08:00", close: "18:00" },
    tue: { closed: false, open: "08:00", close: "18:00" },
    wed: { closed: false, open: "08:00", close: "18:00" },
    thu: { closed: false, open: "08:00", close: "18:00" },
    fri: { closed: false, open: "08:00", close: "17:00" },
    sat: { closed: false, open: "09:00", close: "12:00" },
    sun: { closed: true, open: "09:00", close: "18:00" },
  },
  callRouting: [
    { trigger: "Fuite ou dégât des eaux", target: "+33 6 12 34 56 78" },
    { trigger: "Panne de chauffage", target: "+33 6 12 34 56 78" },
    { trigger: "Fournisseur ou facture", target: "+33 6 98 76 54 32" },
  ],
};

// Conversations WhatsApp de démonstration : numéros des plages réservées à la
// fiction (06 39 98), réponses de l'assistant et une reprise en main.
const DEMO_CONVERSATIONS = [
  {
    contactId: "+33639980611",
    minutesAgo: 25,
    takeover: false,
    messages: [
      { direction: "INBOUND", text: "Bonjour, vous intervenez le samedi ?" },
      { direction: "OUTBOUND", text: "Bonjour ! Oui, Plomberie Lefèvre intervient le samedi de 9 h à 12 h. Souhaitez-vous un rendez-vous ?" },
      { direction: "INBOUND", text: "Oui, pour un robinet qui fuit." },
      { direction: "OUTBOUND", text: "C'est noté. Pouvez-vous me donner votre adresse ? Marc vous confirme le créneau dans la journée." },
    ],
  },
  {
    contactId: "+33639980724",
    minutesAgo: 95,
    takeover: true,
    messages: [
      { direction: "INBOUND", text: "Combien coûte le remplacement d'un chauffe-eau de 200 litres ?" },
      { direction: "OUTBOUND", text: "Le prix dépend du modèle et de l'installation. Je transmets votre demande pour un devis." },
      { direction: "OUTBOUND", text: "Bonjour, c'est Marc. Je peux passer jeudi à 14 h pour le devis, cela vous convient ?", fromOwner: true },
    ],
  },
  {
    contactId: "+33639980857",
    minutesAgo: 60 * 20,
    takeover: false,
    messages: [
      { direction: "INBOUND", text: "Vous intervenez à Villeurbanne ?" },
      { direction: "OUTBOUND", text: "Oui, Plomberie Lefèvre intervient à Lyon et dans les communes voisines, dont Villeurbanne." },
    ],
  },
] as const;

async function seedDemoConversations(db: PrismaClient): Promise<string> {
  const user = await db.user.findUniqueOrThrow({ where: { email: DEMO_EMAIL } });
  const telephony = await db.clientService.findFirstOrThrow({
    where: { userId: user.id, service: { slug: "standard-telephonique-ia" } },
  });
  const service = await db.service.findUniqueOrThrow({ where: { slug: "assistant-whatsapp" } });
  const name = "Réponses automatiques sur WhatsApp";
  const clientService = await db.clientService.upsert({
    where: { organizationId_serviceId_name: { organizationId: telephony.organizationId, serviceId: service.id, name } },
    update: { status: "ACTIVE", whatsappPhoneNumberId: `${DEMO_PREFIX}whatsapp`, whatsappDisplayNumber: "+33199001234" },
    create: {
      userId: user.id,
      organizationId: telephony.organizationId,
      serviceId: service.id,
      name,
      status: "ACTIVE",
      activatedAt: new Date(),
      whatsappPhoneNumberId: `${DEMO_PREFIX}whatsapp`,
      whatsappDisplayNumber: "+33199001234",
    },
  });
  await db.conversation.deleteMany({ where: { clientServiceId: clientService.id } });
  const now = Date.now();
  for (const conversation of DEMO_CONVERSATIONS) {
    const end = now - conversation.minutesAgo * 60_000;
    const step = 4 * 60_000;
    const start = end - (conversation.messages.length - 1) * step;
    await db.conversation.create({
      data: {
        clientServiceId: clientService.id,
        channel: "WHATSAPP",
        contactId: conversation.contactId,
        lastMessageAt: new Date(end),
        lastInboundAt: new Date(start),
        humanTakeoverAt: conversation.takeover ? new Date(end) : null,
        messages: {
          create: conversation.messages.map((message, index) => ({
            direction: message.direction,
            text: message.text,
            sentById: "fromOwner" in message && message.fromOwner ? user.id : null,
            createdAt: new Date(start + index * step),
          })),
        },
      },
    });
  }
  return clientService.id;
}

// Rendez-vous de la semaine en cours, du lundi au vendredi (jour, heure, durée).
const DEMO_BOOKINGS = [
  { day: 0, hour: 9, minutes: 60, name: "Claire Vasseur", notes: "Devis chauffe-eau 200 litres." },
  { day: 0, hour: 14, minutes: 30, name: "Hugo Marchand", notes: "Robinet de salle de bain qui goutte." },
  { day: 1, hour: 10, minutes: 90, name: "Nadia Benali", notes: "Évacuation de douche bouchée." },
  { day: 2, hour: 8, minutes: 60, name: "Julien Perrin", notes: "Contrôle après réparation de fuite." },
  { day: 2, hour: 16, minutes: 30, name: "Léa Fontaine", notes: "Remplacement d'un mitigeur." },
  { day: 3, hour: 11, minutes: 60, name: "Thomas Girard", notes: "Entretien annuel de chaudière." },
  { day: 4, hour: 9, minutes: 30, name: "Sarah Mercier", notes: "Devis salle de bain." },
  { day: 4, hour: 15, minutes: 60, name: "Paul Roussel", notes: "Radiateur qui ne chauffe plus." },
];

async function seedDemoBookings(db: PrismaClient) {
  const user = await db.user.findUniqueOrThrow({ where: { email: DEMO_EMAIL } });
  const clientService = await db.clientService.findFirstOrThrow({
    where: { userId: user.id, service: { slug: "prise-rdv-telephone" } },
  });
  await db.booking.deleteMany({ where: { externalBookingId: { startsWith: DEMO_PREFIX } } });
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  for (const [index, booking] of DEMO_BOOKINGS.entries()) {
    const startAt = new Date(monday);
    startAt.setDate(monday.getDate() + booking.day);
    startAt.setHours(booking.hour);
    await db.booking.create({
      data: {
        clientServiceId: clientService.id,
        kind: "appointment",
        customerName: booking.name,
        customerPhone: `+3363998${String(1000 + index * 37).padStart(4, "0")}`,
        startAt,
        endAt: new Date(startAt.getTime() + booking.minutes * 60_000),
        notes: booking.notes,
        externalBookingId: `${DEMO_PREFIX}${index}`,
      },
    });
  }
}

type Clip = { x: number; y: number; width: number; height: number };

async function capture(
  page: Page,
  path: string,
  name: string,
  target: {
    cardHeading?: string;
    clip?: Clip;
    // Fenêtre plus étroite que 1280 px : l'écran se met en page à cette
    // largeur, et le texte reste lisible une fois la capture réduite sur
    // l'accueil.
    viewport?: { width: number; height: number };
    prepare?: (page: Page) => Promise<void>;
  }
) {
  if (target.viewport) await page.setViewportSize(target.viewport);
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.evaluate((value) => localStorage.setItem("theme", value), theme);
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForLoadState("networkidle");
    // Masque l'indicateur de développement de Next (« N », « Compiling »).
    // L'en-tête collant recouvrirait le haut d'une carte capturée seule.
    await page.addStyleTag({
      // Animations et transitions coupées : une capture prise en plein fondu
      // est floue ou à moitié transparente.
      content:
        "nextjs-portal { display: none !important; } header { position: static !important; } " +
        "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }",
    });
    await page.waitForTimeout(800);
    if (target.prepare) {
      await target.prepare(page);
      await page.waitForTimeout(400);
    }
    const { cardHeading, clip = { x: 0, y: 0, width: 1280, height: 800 } } = target;
    const card = cardHeading
      ? page.getByRole("heading", { name: cardHeading, exact: true }).locator("xpath=ancestor::*[@data-slot='card'][1]")
      : null;
    // Les listes (appels, conversations) se chargent après la page : on
    // attend que plus aucun squelette ne reste à l'écran.
    await (card ?? page.locator("body"))
      .locator('[data-slot="skeleton"]')
      .first()
      .waitFor({ state: "detached", timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);
    const png = card ? await card.screenshot() : await page.screenshot({ clip });
    await sharp(png).webp({ quality: 92, effort: 6, smartSubsample: true }).toFile(`${OUT_DIR}/${name}-${theme}.webp`);
    console.info(`capture : ${OUT_DIR}/${name}-${theme}.webp`);
  }
  if (target.viewport) await page.setViewportSize({ width: 1280, height: 800 });
}

async function main() {
  assertLocal();
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const clientServiceId = await seedDemoCalls(db);
  await seedDemoBookings(db);
  const whatsappServiceId = await seedDemoConversations(db);
  await db.$disconnect();

  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel("E-mail").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe", { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  // Le hero montre l'application entière, barre latérale comprise.
  await capture(page, "/dashboard", "dashboard-overview", { clip: { x: 0, y: 0, width: 1280, height: 800 } });
  await capture(page, `/dashboard/services/${clientServiceId}`, "dashboard-calls", { cardHeading: "Appels reçus" });
  await capture(page, "/dashboard/calendar", "dashboard-calendar", {
    // Pleine largeur : à 1024 px, les noms des rendez-vous étaient tronqués.
    clip: { x: 256, y: 64, width: 1024, height: 640 },
    prepare: (page) => page.getByRole("button", { name: "Semaine" }).click(),
  });
  await capture(page, `/dashboard/services/${whatsappServiceId}`, "dashboard-conversations", {
    cardHeading: "Conversations",
  });
  await capture(page, `/dashboard/services/${clientServiceId}/configuration`, "dashboard-settings", {
    clip: { x: 256, y: 64, width: 1024, height: 640 },
    prepare: (page) => page.getByRole("tab", { name: "Règles" }).click(),
  });
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
