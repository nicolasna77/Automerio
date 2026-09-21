import { expect, test } from "@playwright/test";
import { ANONYMOUS } from "./roles";

test.use({ storageState: ANONYMOUS });

test("l'accueil présente l'offre et mène au catalogue", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: /vos clients obtiennent une réponse/i })
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Créer mon compte" }).first()).toBeVisible();

  await page.getByRole("link", { name: "Voir les solutions" }).first().click();
  await expect(page.locator("#prestations")).toBeVisible();
});

test("une page de solution annonce son tarif et propose d'agir", async ({ page }) => {
  await page.goto("/prestations/assistant-whatsapp");

  await expect(
    page.getByRole("heading", { level: 1, name: "Réponses automatiques sur WhatsApp" })
  ).toBeVisible();

  await expect(page.getByRole("heading", { name: "Tarif" })).toBeVisible();
  await expect(page.getByText(/€.*par mois/)).toBeVisible();

  await expect(
    page.getByRole("heading", { name: /Prêt à activer/ })
  ).toBeVisible();
});

test("une page de solution dit ce qu'elle change pour le client", async ({ page }) => {
  await page.goto("/prestations/standard-telephonique-ia");

  await expect(
    page.getByRole("heading", { name: "Ce que ça change pour vous" })
  ).toBeVisible();
  await expect(
    page.getByText("Plus un seul appel qui sonne dans le vide")
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: /situations où elle travaille/ })
  ).toBeVisible();
  await expect(page.getByText("Plomberie", { exact: true })).toBeVisible();
});

test("une solution inconnue rend une page 404, pas une erreur", async ({ page }) => {
  const response = await page.goto("/prestations/cette-solution-nexiste-pas");
  expect(response?.status()).toBe(404);
});
