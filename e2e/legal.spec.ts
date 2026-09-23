import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { ANONYMOUS } from "./roles";

/** Prefixe des adresses creees par le test d'inscription. */
const SIGNUP_PREFIX = "inscription-";

test.use({ storageState: ANONYMOUS });

const LEGAL_PAGES = [
  { path: "/mentions-legales", title: "Mentions légales" },
  { path: "/cgv", title: "Conditions générales de vente" },
  { path: "/confidentialite", title: "Politique de confidentialité" },
  { path: "/cookies", title: "Cookies" },
];

for (const { path, title } of LEGAL_PAGES) {
  test(`la page ${path} s'affiche`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  });
}

test("le pied de page mène aux conditions générales de vente", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Informations légales" })
    .getByRole("link", { name: "CGV" })
    .click();
  await page.waitForURL("**/cgv");
  await expect(page.getByText(/Satisfait ou remboursé pendant 30 jours/)).toBeVisible();
});

test("les pages portent les en-têtes de sécurité", async ({ page }) => {
  const response = await page.request.get("/");
  const headers = response.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-powered-by"]).toBeUndefined();
});

/**
 * Les comptes crees par le test ci-dessous, y compris ceux qu'une execution
 * interrompue aurait laisses. Sans ce menage, la liste des utilisateurs
 * s'allonge a chaque passage et finit par repousser en seconde page les comptes
 * que d'autres tests vont chercher.
 */
test.afterEach(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: SIGNUP_PREFIX } } });
});

test("l'inscription demande de confirmer l'adresse e-mail", async ({ page }) => {
  const email = `${SIGNUP_PREFIX}${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Nom").fill("Camille Test");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse-solide");
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page.getByText("Vérifiez votre boîte mail")).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});

test("l'export des données est réservé aux personnes connectées", async ({ page }) => {
  const response = await page.request.get("/dashboard/profile/export", { maxRedirects: 0 });
  expect(response.status()).not.toBe(200);
});
