import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { hashPhone, normalizeFrenchPhone } from "@/lib/demo-call";
import { ANONYMOUS } from "./roles";

// Le serveur de test tourne avec DEMO_CALL_DRY_RUN : tout le parcours
// s'execute, seul l'appel Twilio est saute.
test.use({ storageState: ANONYMOUS });

const TELEPHONY_PAGE = "/prestations/standard-telephonique-ia";

function randomMobile(): string {
  const rest = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
  return `06${rest}`;
}

const usedNumbers: string[] = [];

test.afterEach(async () => {
  const hashes = usedNumbers.splice(0).map((n) => hashPhone(normalizeFrenchPhone(n)!));
  await db.demoCall.deleteMany({ where: { phoneHash: { in: hashes } } });
});

test("un visiteur se fait appeler une fois, pas deux", async ({ page }) => {
  const number = randomMobile();
  usedNumbers.push(number);

  await page.goto(TELEPHONY_PAGE);
  const section = page.getByRole("region", { name: "Faites-vous appeler par notre assistant" });
  await expect(section).toBeVisible();

  const phone = section.getByLabel("Votre numéro de téléphone");
  const submit = section.getByRole("button", { name: "Recevoir l'appel" });

  // Numero surtaxe : refuse avant tout appel.
  await phone.fill("08 99 12 34 56");
  await submit.click();
  await expect(section.getByRole("alert")).toContainText("numéro de mobile ou de fixe français");

  // Pas de case a cocher : le consentement tient a la demande, annoncee sous le bouton.
  await expect(section.getByRole("checkbox")).toHaveCount(0);
  await expect(section.getByRole("link", { name: /politique de confidentialité/ })).toHaveAttribute(
    "href",
    "/confidentialite"
  );
  await phone.fill(number);
  await submit.click();
  await expect(section.getByRole("status")).toContainText("Votre téléphone va sonner");
  await expect(section.getByRole("status")).toContainText(
    number.replace(/(\d{2})(?=\d)/g, "$1 ")
  );

  // Le meme numero, depuis une nouvelle visite : l'essai est consomme.
  await page.reload();
  await section.getByLabel("Votre numéro de téléphone").fill(number);
  await section.getByRole("button", { name: "Recevoir l'appel" }).click();
  await expect(section.getByRole("alert")).toContainText("déjà reçu son appel d'essai");
});

test("l'essai n'est proposé que sur les solutions téléphoniques", async ({ page }) => {
  await page.goto("/prestations/assistant-whatsapp");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Faites-vous appeler par notre assistant" })
  ).toHaveCount(0);
});
