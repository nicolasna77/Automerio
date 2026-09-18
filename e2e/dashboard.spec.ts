import { expect, test } from "@playwright/test";
import { CLIENT, CLIENT_STATE, ANONYMOUS } from "./roles";

test.use({ storageState: CLIENT_STATE });

test("le panneau de notifications s'ouvre", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByRole("button", { name: /^Notifications/ }).click();

  const panel = page.getByRole("menu");
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Notifications")).toBeVisible();
});

test("un client se déconnecte et retrouve le site public", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByRole("button", { name: "Menu utilisateur" }).click();
  await page.getByRole("menuitem", { name: "Se déconnecter" }).click();

  await page.waitForURL("/");
  await expect(page.getByRole("link", { name: "Créer mon compte" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu utilisateur" })).toHaveCount(0);
});

test.describe("depuis un visiteur", () => {
  test.use({ storageState: ANONYMOUS });

  test("un client se connecte et atterrit sur son tableau de bord", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(CLIENT.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(CLIENT.password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
