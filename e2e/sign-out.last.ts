import { expect, test } from "@playwright/test";
import { CLIENT_STATE } from "./roles";

test.use({ storageState: CLIENT_STATE });

test("un client se déconnecte et retrouve le site public", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByRole("button", { name: "Menu utilisateur" }).click();
  await page.getByRole("menuitem", { name: "Se déconnecter" }).click();

  await page.waitForURL("/");
  await expect(page.getByRole("link", { name: "Créer mon compte" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu utilisateur" })).toHaveCount(0);
});
