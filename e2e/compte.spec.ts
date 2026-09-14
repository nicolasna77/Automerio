import { expect, test } from "@playwright/test";
import { CLIENT_STATE } from "./roles";

test.use({ storageState: CLIENT_STATE });

test("une erreur de validation serveur reste lisible en production", async ({ page }) => {
  await page.goto("/dashboard/aide");
  await page.getByLabel("Objet").fill("   ");
  await page.getByLabel("Message").fill("   ");
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();

  await expect(page.getByText("Merci de renseigner un objet et un message.")).toBeVisible();
  await expect(page.getByText(/Minified React error/)).toHaveCount(0);
});

test("la fenêtre d'activation propose le nom de la solution", async ({ page }) => {
  await page.goto("/dashboard/prestations");
  await page.getByRole("button", { name: "Découvrir les solutions" }).click();
  await page.getByRole("button", { name: /^Activer( à nouveau)?$/ }).first().click();

  const dialog = page.getByRole("dialog");
  const title = (await dialog.getByRole("heading").first().textContent()) ?? "";
  const serviceName = title.match(/« (.+) »/)?.[1];
  expect(serviceName).toBeTruthy();
  await expect(dialog.getByLabel("Nom de cette activation")).toHaveValue(serviceName!);
});

test("le profil propose la double authentification et l'export", async ({ page }) => {
  await page.goto("/dashboard/profile");
  await expect(page.getByRole("heading", { name: "Double authentification" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Supprimer mon compte" })).toBeVisible();

  const response = await page.request.get("/dashboard/profile/export");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-disposition"]).toMatch(/attachment; filename="mes-donnees-automerio-/);
  const data = await response.json();
  expect(data.account.email).toBeTruthy();
  expect(JSON.stringify(data)).not.toMatch(/accessToken|refreshToken|password/);
});
