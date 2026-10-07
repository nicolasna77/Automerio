import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { CLIENT, CLIENT_STATE } from "./roles";

test.use({ storageState: CLIENT_STATE });

const createdServiceIds: string[] = [];

test.afterEach(async () => {
  await db.clientService.deleteMany({ where: { id: { in: createdServiceIds.splice(0) } } });
});

test("les échanges de l'assistant WhatsApp se relisent dans le tableau de bord", async ({ page }) => {
  const [organization, whatsapp] = await Promise.all([
    db.organization.findFirstOrThrow({
      where: { members: { some: { user: { email: CLIENT.email } } } },
      select: { id: true, members: { select: { userId: true }, take: 1 } },
    }),
    db.service.findUniqueOrThrow({ where: { slug: "assistant-whatsapp" }, select: { id: true } }),
  ]);

  const clientService = await db.clientService.create({
    data: {
      organizationId: organization.id,
      userId: organization.members[0].userId,
      serviceId: whatsapp.id,
      name: "WhatsApp de test",
      status: "CONFIGURING",
      conversations: {
        create: {
          channel: "WHATSAPP",
          contactId: "33612345678",
          lastInboundAt: new Date(),
          messages: {
            create: [
              { direction: "INBOUND", text: "Bonsoir, vous faites les devis ?", externalId: `e2e-wamid-${Date.now()}` },
              { direction: "OUTBOUND", text: "Bonsoir, oui, le devis est gratuit.", createdAt: new Date(Date.now() + 1) },
            ],
          },
        },
      },
    },
  });
  createdServiceIds.push(clientService.id);

  await page.goto(`/dashboard/services/${clientService.id}`);
  await expect(page.getByRole("heading", { name: "Conversations" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Liste des conversations" })
    .getByRole("button", { name: /06 12 34 56 78/ })
    .click();

  const exchanges = page.getByRole("list", { name: "Échanges avec 06 12 34 56 78" });
  await expect(exchanges).toContainText("Bonsoir, vous faites les devis ?");
  await expect(exchanges).toContainText("Bonsoir, oui, le devis est gratuit.");
  await expect(page.getByLabel("Votre réponse à 06 12 34 56 78")).toBeVisible();
});

test("le client reprend la main sur une conversation puis la rend à l'assistant", async ({ page }) => {
  const [organization, whatsapp] = await Promise.all([
    db.organization.findFirstOrThrow({
      where: { members: { some: { user: { email: CLIENT.email } } } },
      select: { id: true, members: { select: { userId: true }, take: 1 } },
    }),
    db.service.findUniqueOrThrow({ where: { slug: "assistant-whatsapp" }, select: { id: true } }),
  ]);

  const clientService = await db.clientService.create({
    data: {
      organizationId: organization.id,
      userId: organization.members[0].userId,
      serviceId: whatsapp.id,
      name: "WhatsApp de reprise",
      status: "CONFIGURING",
      conversations: {
        create: {
          channel: "WHATSAPP",
          contactId: "33639980001",
          lastInboundAt: new Date(),
          messages: {
            create: [{ direction: "INBOUND", text: "Je voudrais parler à quelqu'un.", externalId: `e2e-wamid-reprise-${Date.now()}` }],
          },
        },
      },
    },
    include: { conversations: { select: { id: true } } },
  });
  createdServiceIds.push(clientService.id);

  await page.goto(`/dashboard/services/${clientService.id}`);
  const thread = page.getByRole("region", { name: "Conversation avec 06 39 98 00 01" });

  await thread.getByRole("button", { name: "Reprendre la main" }).click();
  await expect(thread.getByText("Assistant en pause")).toBeVisible();
  await expect
    .poll(async () => (await db.conversation.findUniqueOrThrow({ where: { id: clientService.conversations[0].id } })).humanTakeoverAt)
    .not.toBeNull();

  await thread.getByRole("button", { name: "Rendre la main à l'assistant" }).click();
  await expect(thread.getByRole("button", { name: "Reprendre la main" })).toBeVisible();
  await expect
    .poll(async () => (await db.conversation.findUniqueOrThrow({ where: { id: clientService.conversations[0].id } })).humanTakeoverAt)
    .toBeNull();
});

test("les conversations Messenger se filtrent par jour", async ({ page }) => {
  const [organization, messenger] = await Promise.all([
    db.organization.findFirstOrThrow({
      where: { members: { some: { user: { email: CLIENT.email } } } },
      select: { id: true, members: { select: { userId: true }, take: 1 } },
    }),
    db.service.findUniqueOrThrow({ where: { slug: "assistant-facebook" }, select: { id: true } }),
  ]);
  const now = Date.now();
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);

  const clientService = await db.clientService.create({
    data: {
      organizationId: organization.id,
      userId: organization.members[0].userId,
      serviceId: messenger.id,
      name: "Messenger filtré",
      status: "CONFIGURING",
      conversations: {
        create: [
          {
            channel: "MESSENGER",
            contactId: "100000000001111",
            lastInboundAt: new Date(now),
            lastMessageAt: new Date(now),
            messages: { create: [{ direction: "INBOUND", text: "Message d'aujourd'hui", externalId: `e2e-mid-jour-${now}` }] },
          },
          {
            channel: "MESSENGER",
            contactId: "100000000002222",
            lastInboundAt: threeDaysAgo,
            lastMessageAt: threeDaysAgo,
            messages: {
              create: [
                { direction: "INBOUND", text: "Message plus ancien", externalId: `e2e-mid-ancien-${now}`, createdAt: threeDaysAgo },
              ],
            },
          },
        ],
      },
    },
  });
  createdServiceIds.push(clientService.id);

  await page.goto(`/dashboard/services/${clientService.id}`);
  const list = page.getByRole("navigation", { name: "Liste des conversations" });
  await expect(list.getByRole("button")).toHaveCount(2);

  await page.getByRole("combobox", { name: "Filtrer par jour" }).click();
  await page.getByRole("option", { name: /Aujourd'hui/ }).click();

  await expect(page.getByRole("status").filter({ hasText: /conversation/ })).toHaveText("1 conversation aujourd'hui");
  await expect(list.getByRole("button")).toHaveCount(1);
  await expect(list).toContainText("Contact ·1111");
  await expect(list).not.toContainText("Contact ·2222");
});
