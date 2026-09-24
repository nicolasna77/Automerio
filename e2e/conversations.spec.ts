import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { CLIENT, CLIENT_STATE } from "./roles";

test.use({ storageState: CLIENT_STATE });

const createdServiceIds: string[] = [];

test.afterEach(async () => {
  // La suppression de la solution emporte ses conversations et leurs messages.
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

  const conversation = page.getByText("06 12 34 56 78");
  await expect(conversation).toBeVisible();
  await conversation.click();

  const exchanges = page.getByRole("list", { name: "Échanges avec 06 12 34 56 78" });
  await expect(exchanges).toContainText("Bonsoir, vous faites les devis ?");
  await expect(exchanges).toContainText("Bonsoir, oui, le devis est gratuit.");
});
