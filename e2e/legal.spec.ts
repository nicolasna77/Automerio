import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { ANONYMOUS, isolatedClientIp } from "./roles";

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

const createdEmails: string[] = [];

test.afterEach(async () => {
  await db.user.deleteMany({
    where: {
      OR: [
        { email: { in: createdEmails.splice(0) } },
        {
          email: { startsWith: SIGNUP_PREFIX },
          createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
        },
      ],
    },
  });
});

test("l'inscription demande de confirmer l'adresse e-mail", async ({ page }) => {
  await page.setExtraHTTPHeaders(isolatedClientIp());
  const email = `${SIGNUP_PREFIX}${Date.now()}@example.com`;
  createdEmails.push(email);
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
