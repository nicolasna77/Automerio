import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { CLIENT, CLIENT_STATE } from "./roles";

test.use({ storageState: CLIENT_STATE });

const createdIds: string[] = [];

test.afterEach(async () => {
  await db.usageEvent.deleteMany({ where: { id: { in: createdIds.splice(0) } } });
});

test("un appel à rappeler s'affiche en tête du tableau de bord, puis se marque traité", async ({ page }) => {
  const service = await db.clientService.findFirstOrThrow({
    where: {
      service: { slug: "standard-telephonique-ia" },
      organization: { members: { some: { user: { email: CLIENT.email } } } },
    },
    select: { id: true },
  });
  // Un motif unique : d'autres tests creent des appels sur la meme solution.
  const reason = `Devis salle de bain ${Date.now()}`;
  const call = await db.usageEvent.create({
    data: {
      clientServiceId: service.id,
      type: "call",
      status: "completed",
      occurredAt: new Date(),
      durationSec: 75,
      externalId: `e2e-rappel-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      metadata: { fromNumber: "+33698765432", outcome: "message_taken" },
      callSummary: {
        create: {
          reason,
          summary: "M. Martin souhaite un devis pour refaire sa salle de bain.",
          followUp: "Rappeler M. Martin pour fixer une visite",
          callerName: "M. Martin",
          transcript: [],
        },
      },
    },
  });
  createdIds.push(call.id);

  await page.goto("/dashboard");
  const card = page.getByRole("heading", { name: "Appels à rappeler" }).locator("xpath=ancestor::*[@data-slot='card'][1]");
  await expect(card).toContainText(reason);
  await expect(card).toContainText("Rappeler M. Martin pour fixer une visite");
  await expect(card.getByRole("link", { name: "Rappeler" }).first()).toHaveAttribute("href", /^tel:\+33/);
  await expect(page.getByRole("link", { name: /Vue d'ensemble/ })).toContainText("appels à rappeler");

  await card.getByRole("button", { name: `Marquer comme traité : ${reason}` }).click();
  await expect(page.getByText(reason)).toHaveCount(0);

  const updated = await db.usageEvent.findUniqueOrThrow({ where: { id: call.id }, select: { handledAt: true } });
  expect(updated.handledAt).not.toBeNull();
});
