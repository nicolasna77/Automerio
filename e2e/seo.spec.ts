import { expect, test } from "@playwright/test";
import { ANONYMOUS } from "./roles";

test.use({ storageState: ANONYMOUS });

test("robots.txt autorise le site et déclare le sitemap", async ({ page }) => {
  const response = await page.request.get("/robots.txt");
  expect(response.status()).toBe(200);

  const body = await response.text();
  expect(body).toContain("Sitemap:");
  expect(body).toContain("/dashboard/");
  expect(body).toContain("/admin/");
});

test("le sitemap liste l'accueil et les solutions du catalogue", async ({ page }) => {
  const response = await page.request.get("/sitemap.xml");
  expect(response.status()).toBe(200);

  const body = await response.text();
  expect(body).toContain("<urlset");
  expect(body).toContain("/prestations/assistant-whatsapp");
  expect(body).toContain("/contact");
});

test("l'accueil déclare une organisation et sa FAQ", async ({ page }) => {
  await page.goto("/");

  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = blocks.map((b) => JSON.parse(b)["@type"]);
  expect(types).toContain("Organization");
  expect(types).toContain("FAQPage");

  const faq = blocks.map((b) => JSON.parse(b)).find((d) => d["@type"] === "FAQPage");
  const firstQuestion = faq.mainEntity[0].name;
  await expect(page.getByText(firstQuestion)).toBeVisible();
});

test("une page de solution déclare son offre et son prix", async ({ page }) => {
  await page.goto("/prestations/assistant-whatsapp");

  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const service = blocks.map((b) => JSON.parse(b)).find((d) => d["@type"] === "Service");

  expect(service.name).toBe("Réponses automatiques sur WhatsApp");
  expect(service.provider.name).toBe("Automerio");
  expect(JSON.stringify(service)).toContain("EUR");
});

test("l'aperçu de partage porte le prix", async ({ page }) => {
  await page.goto("/prestations/assistant-whatsapp");

  const description = await page
    .locator('meta[property="og:description"]')
    .getAttribute("content");
  expect(description).toMatch(/€/);

  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
});

test("llms.txt décrit l'offre avec ses tarifs", async ({ page }) => {
  const response = await page.request.get("/llms.txt");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");

  const body = await response.text();
  expect(body).toContain("# Automerio");
  expect(body).toContain("Réponses automatiques sur WhatsApp");
  expect(body).toMatch(/€/);
  expect(body).toContain("Questions fréquentes");
});
