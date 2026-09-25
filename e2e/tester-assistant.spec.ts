import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { CLIENT, CLIENT_STATE } from "./roles";

// Le serveur de test tourne avec DEMO_CALL_DRY_RUN : le test s'enregistre,
// seul l'appel Twilio est saute. Les deux tests partagent le compteur du jour
// de la meme solution : ils passent l'un apres l'autre.
test.use({ storageState: CLIENT_STATE });
test.describe.configure({ mode: "serial" });

async function standardService() {
  return db.clientService.findFirstOrThrow({
    where: {
      service: { slug: "standard-telephonique-ia" },
      organization: { members: { some: { user: { email: CLIENT.email } } } },
    },
    select: { id: true },
  });
}

let startedAt = new Date();

test.beforeEach(() => {
  startedAt = new Date();
});

test.afterEach(async () => {
  const { id } = await standardService();
  await db.testCall.deleteMany({ where: { clientServiceId: id, createdAt: { gte: startedAt } } });
});

test("le client se fait appeler par son propre assistant", async ({ page }) => {
  const { id } = await standardService();
  await page.goto(`/dashboard/services/${id}`);

  const card = page.getByRole("heading", { name: "Tester votre assistant" }).locator("xpath=ancestor::*[@data-slot='card'][1]");
  await expect(card).toContainText("Rien n'est enregistré");

  await card.getByLabel("Votre numéro de téléphone").fill("08 99 12 34 56");
  await card.getByRole("button", { name: "M'appeler" }).click();
  await expect(card.getByRole("alert")).toContainText("numéro de mobile ou de fixe français");

  await card.getByLabel("Votre numéro de téléphone").fill("06 11 22 33 44");
  await card.getByRole("button", { name: "M'appeler" }).click();
  await expect(card.getByRole("status")).toContainText("Nous appelons le 06 11 22 33 44");

  const created = await db.testCall.findFirstOrThrow({
    where: { clientServiceId: id, createdAt: { gte: startedAt } },
    select: { status: true },
  });
  expect(created.status).toBe("CALLING");
});

test("au-delà de cinq tests par jour, le client est prié d'attendre", async ({ page }) => {
  const { id } = await standardService();
  const owner = await db.user.findUniqueOrThrow({ where: { email: CLIENT.email }, select: { id: true } });
  await db.testCall.createMany({
    data: Array.from({ length: 5 }, () => ({ clientServiceId: id, requestedById: owner.id, status: "COMPLETED" as const })),
  });

  await page.goto(`/dashboard/services/${id}`);
  const card = page.getByRole("heading", { name: "Tester votre assistant" }).locator("xpath=ancestor::*[@data-slot='card'][1]");
  await card.getByLabel("Votre numéro de téléphone").fill("06 11 22 33 44");
  await card.getByRole("button", { name: "M'appeler" }).click();
  await expect(card.getByRole("alert")).toContainText("Vous avez fait 5 tests aujourd'hui");
});
