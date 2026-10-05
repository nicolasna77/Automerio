import { expect, test } from "@playwright/test";
import { ANONYMOUS } from "./roles";

test.use({ storageState: ANONYMOUS });

test("l'accueil présente l'offre et mène au catalogue", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: /aucun appel manqué/i })
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Créer mon compte" }).first()).toBeVisible();

  await page.getByRole("link", { name: "Voir comment ça fonctionne" }).click();
  await expect(page.locator("#method")).toBeInViewport();

  await page.getByRole("link", { name: "Voir les solutions" }).first().click();
  await expect(page.locator("#services")).toBeVisible();
});

test("une page de solution annonce son tarif et propose d'agir", async ({ page }) => {
  await page.goto("/services/assistant-whatsapp");

  await expect(
    page.getByRole("heading", { level: 1, name: "Réponses automatiques sur WhatsApp" })
  ).toBeVisible();

  await expect(page.getByRole("heading", { name: "Tarif" })).toBeVisible();
  await expect(page.getByText(/€.*par mois/)).toBeVisible();

  await expect(
    page.getByRole("heading", { name: /depuis votre compte/ })
  ).toBeVisible();
});

test("une page de solution dit ce qu'elle change pour le client", async ({ page }) => {
  await page.goto("/services/standard-telephonique-ia");

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
  const response = await page.goto("/services/cette-solution-nexiste-pas");
  expect(response?.status()).toBe(404);
});

test("les anciennes adresses en français redirigent vers les nouvelles", async ({ request }) => {
  const cases: [string, string][] = [
    ["/prestations/assistant-whatsapp", "/services/assistant-whatsapp"],
    ["/confidentialite", "/privacy"],
    ["/mentions-legales", "/legal-notice"],
    ["/cgv", "/terms"],
    ["/dashboard/prestations/activer/standard-telephonique-ia", "/dashboard/services/activate/standard-telephonique-ia"],
    ["/dashboard/prestations/catalogue", "/dashboard/services/catalog"],
    ["/dashboard/aide", "/dashboard/help"],
    ["/admin/codes-promo", "/admin/promo-codes"],
  ];
  for (const [from, to] of cases) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(308);
    expect(new URL(response.headers().location, "http://x").pathname, from).toBe(to);
  }
});
