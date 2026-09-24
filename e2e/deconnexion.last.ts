import { expect, test } from "@playwright/test";
import { CLIENT_STATE } from "./roles";

/**
 * Se deconnecter revoque la session cote serveur, et cette session est celle
 * que partagent tous les tests menes en tant que client. Lance au milieu des
 * autres, ce test deconnectait au hasard celui qui tournait en meme temps :
 * il a son propre projet Playwright, qui ne demarre qu'une fois les autres finis.
 */
test.use({ storageState: CLIENT_STATE });

test("un client se déconnecte et retrouve le site public", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByRole("button", { name: "Menu utilisateur" }).click();
  await page.getByRole("menuitem", { name: "Se déconnecter" }).click();

  await page.waitForURL("/");
  await expect(page.getByRole("link", { name: "Créer mon compte" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu utilisateur" })).toHaveCount(0);
});
