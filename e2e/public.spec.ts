import { expect, test } from "@playwright/test";
import { ANONYMOUS } from "./roles";

test.use({ storageState: ANONYMOUS });

test("l'accueil présente l'offre et mène au catalogue", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: /automatisations/i })
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

test("une solution inconnue rend une page 404, pas une erreur", async ({ page }) => {
  const response = await page.goto("/prestations/cette-solution-nexiste-pas");
  expect(response?.status()).toBe(404);
});
