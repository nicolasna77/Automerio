import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { CLIENT, CLIENT_STATE } from "./roles";

test.use({ storageState: CLIENT_STATE });

const createdIds: string[] = [];

test.afterEach(async () => {
  await db.usageEvent.deleteMany({ where: { id: { in: createdIds.splice(0) } } });
});

test("la jauge prévient avant que le forfait soit dépassé", async ({ page }) => {
  const standard = await db.clientService.findFirstOrThrow({
    where: {
      service: { slug: "standard-telephonique-ia" },
      organization: { members: { some: { user: { email: CLIENT.email } } } },
    },
    select: { id: true, includedUsageUnits: true },
  });
  const included = standard.includedUsageUnits ?? 150;
  const minutes = Math.ceil(included * 0.85);

  const call = await db.usageEvent.create({
    data: {
      clientServiceId: standard.id,
      type: "call",
      status: "completed",
      occurredAt: new Date(),
      endedAt: new Date(),
      durationSec: minutes * 60,
      externalId: `e2e-quota-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
  });
  createdIds.push(call.id);

  await page.goto("/dashboard/abonnements");
  const running = page.getByRole("region", { name: "En cours" });
  // Le nombre exact depend des autres appels de la periode (d'autres tests en
  // ajoutent en parallele sur la meme solution) : seul compte l'avertissement.
  await expect(running.getByText(/^Plus que \d+ min$/)).toBeVisible();
  await expect(running.getByText(/Au-delà, chaque minute est facturée/)).toBeVisible();
});
