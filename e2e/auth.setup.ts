import { test as setup, expect } from "@playwright/test";
import { CLIENT, ADMIN, CLIENT_STATE, ADMIN_STATE, isolatedClientIp } from "./roles";

setup("authentifier un client", async ({ page }) => {
  await page.setExtraHTTPHeaders(isolatedClientIp());
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(CLIENT.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(CLIENT.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.context().storageState({ path: CLIENT_STATE });
});

setup("authentifier un admin", async ({ page }) => {
  await page.setExtraHTTPHeaders(isolatedClientIp());
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/admin");
  await expect(page).toHaveURL(/\/admin/);
  await page.context().storageState({ path: ADMIN_STATE });
});
