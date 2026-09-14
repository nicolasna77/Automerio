import { expect, test } from "@playwright/test";
import { ADMIN_STATE, ANONYMOUS } from "./roles";

test.use({ storageState: ADMIN_STATE });

test("le détail d'un utilisateur montre ce que voit le client", async ({ page }) => {
  await page.goto("/admin/users");
  await page.getByRole("link", { name: "Marc Lefèvre" }).click();
  await page.waitForURL(/\/admin\/users\/[^/]+$/);

  await expect(page.getByRole("heading", { name: "Ce que voit le client" })).toBeVisible();

  await expect(page.getByRole("columnheader", { name: "État" })).toBeVisible();

  await expect(page.getByRole("button", { name: /Direct|En pause/ })).toBeVisible();
});

test("le centre d'aide propose le direct et l'export", async ({ page }) => {
  await page.goto("/admin/aide");

  await expect(page.getByRole("button", { name: /Direct|En pause/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Exporter en CSV" })).toBeVisible();
});

test("l'export clients rend un CSV téléchargeable", async ({ page }) => {
  const response = await page.request.get("/admin/export/clients");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  expect(response.headers()["content-disposition"]).toMatch(
    /attachment; filename="clients-automerio-/
  );

  const body = await response.text();
  expect(body.split("\r\n")[0]).toContain("Client;E-mail;Organisation;Solution");
});

test("la liste clients bascule en cartes sur mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");

  const tables = page.locator("table");
  const count = await tables.count();
  for (let i = 0; i < count; i++) {
    await expect(tables.nth(i)).toBeHidden();
  }
});

test("la page des codes promo s'ouvre", async ({ page }) => {
  await page.goto("/admin/codes-promo");
  await expect(page.getByRole("heading", { level: 1, name: "Codes promo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Créer un code" })).toBeVisible();
});

test.describe("sans session", () => {
  test.use({ storageState: ANONYMOUS });

  test("un visiteur n'obtient pas l'export", async ({ page }) => {
    const response = await page.request.get("/admin/export/clients", { maxRedirects: 0 });
    expect(response.status()).not.toBe(200);
  });
});
