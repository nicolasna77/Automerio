import { expect, test } from "@playwright/test";
import { ANONYMOUS, CLIENT } from "./roles";

test.use({ storageState: ANONYMOUS });

test("le volume choisi sur la page publique suit le visiteur jusqu'à l'activation", async ({
  page,
}) => {
  await page.goto("/prestations/standard-telephonique-ia");

  const slider = page.getByRole("slider");
  const floor = Number(await slider.getAttribute("aria-valuenow"));
  const add = page.getByRole("button", { name: /^Ajouter / });
  await add.click();
  await add.click();
  await expect(slider).not.toHaveAttribute("aria-valuenow", String(floor));
  const chosen = await slider.getAttribute("aria-valuenow");

  await page.getByRole("link", { name: /^Continuer avec / }).click();
  await page.waitForURL(/\/signup\?next=/);

  // Un compte existe deja : la destination survit au passage vers la connexion.
  await page.getByRole("link", { name: "Se connecter" }).click();
  await page.waitForURL(/\/login\?next=/);
  await page.getByLabel("E-mail").fill(CLIENT.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(CLIENT.password);
  await page.getByRole("button", { name: "Se connecter" }).click();

  await page.waitForURL(
    new RegExp(`/dashboard/prestations/activer/standard-telephonique-ia\\?minutes=${chosen}$`)
  );
  await expect(page.getByRole("slider")).toHaveAttribute("aria-valuenow", chosen!);
});

// Sans connexion : better-auth limite les tentatives, et `safeNextPath` a ses
// tests unitaires (autres origines comprises).
test("une page protégée renvoie à la connexion en gardant la destination", async ({ page }) => {
  await page.goto("/dashboard/paiements");
  await page.waitForURL(/\/login\?next=%2Fdashboard%2Fpaiements$/);
  await expect(page.getByRole("link", { name: "Créer mon compte" })).toHaveAttribute(
    "href",
    "/signup?next=%2Fdashboard%2Fpaiements"
  );
});
