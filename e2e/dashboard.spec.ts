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

test("le client suit le quota de ses abonnements en cours", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Abonnements", exact: true }).click();
  await page.waitForURL("**/dashboard/abonnements");

  await expect(page.getByRole("heading", { name: "Abonnements", level: 1 })).toBeVisible();

  const running = page.getByRole("region", { name: "En cours" });
  await expect(running.getByRole("link", { name: "Standard téléphonique automatisé" })).toBeVisible();

  // Le plafond n'est plus une phrase libre : chaque jauge lit la quantite
  // incluse de sa solution. Les deux prestations telephoniques comptent en
  // minutes depuis que le quota en appels s'est revele deficitaire.
  const jauges = running.locator('[role="progressbar"][aria-valuemax="150"]');
  await expect(jauges).toHaveCount(2);
  await expect(jauges.first()).toHaveAttribute("aria-valuetext", /min$/);
  await expect(running.getByText("Quota consommé").first()).toBeVisible();

  await expect(page.getByRole("button", { name: "Se désabonner" }).first()).toBeVisible();

  // Le meme quota se retrouve sur la page de la solution concernee.
  await running.getByRole("link", { name: "Standard téléphonique automatisé" }).click();
  await page.waitForURL(/\/dashboard\/services\/[^/]+$/);
  await expect(page.getByText("Abonnement", { exact: true })).toBeVisible();
  await expect(page.locator('[role="progressbar"][aria-valuemax="150"]')).toBeVisible();
  // Le plafond n'est annonce qu'une fois : la jauge remplace la ligne du tableau.
  await expect(page.getByText("Plafond d'usage")).toHaveCount(0);
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

test("les solutions actives et le catalogue sont deux onglets distincts", async ({ page }) => {
  await page.goto("/dashboard/prestations");
  const tabs = page.getByRole("navigation", { name: "Solutions" });
  await expect(tabs.getByRole("link", { name: /^Mes solutions/ })).toHaveAttribute("aria-current", "page");
  // Le catalogue n'est plus empile sous la liste.
  await expect(page.getByRole("region", { name: "Catalogue" })).toHaveCount(0);

  await tabs.getByRole("link", { name: "Catalogue" }).click();
  await page.waitForURL("**/dashboard/prestations/catalogue");
  await expect(page.getByRole("region", { name: "Catalogue" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Mes solutions" })).toHaveCount(0);
});
