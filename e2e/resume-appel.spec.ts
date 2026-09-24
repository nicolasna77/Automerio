import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { CLIENT, CLIENT_STATE } from "./roles";

test.use({ storageState: CLIENT_STATE });

const EXTERNAL_PREFIX = "e2e-resume-";

// Chaque test ne nettoie que ce qu'il a cree : les tests de ce fichier tournent
// en parallele, un menage par prefixe effacerait l'appel d'un voisin en cours.
const createdCallIds: string[] = [];

async function clientServiceOf(email: string, slug: string) {
  return db.clientService.findFirstOrThrow({
    where: {
      service: { slug },
      organization: { members: { some: { user: { email } } } },
    },
    select: { id: true },
  });
}

async function seedSummarizedCall(clientServiceId: string) {
  const call = await db.usageEvent.create({
    data: {
      clientServiceId,
      type: "call",
      status: "completed",
      occurredAt: new Date(),
      endedAt: new Date(),
      durationSec: 94,
      externalId: `${EXTERNAL_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`,
      metadata: { fromNumber: "+33612345678", outcome: "message_taken" },
      callSummary: {
        create: {
          reason: "Fuite sous l'évier, intervention urgente",
          summary: "Mme Durand signale une fuite sous l'évier de sa cuisine et souhaite une intervention aujourd'hui.",
          followUp: "Rappeler Mme Durand avant 18 h",
          callerName: "Mme Durand",
          transcript: [
            { speaker: "assistant", text: "Plomberie Lefèvre, bonjour." },
            { speaker: "caller", text: "Bonjour, j'ai une fuite sous l'évier." },
          ],
        },
      },
    },
  });
  createdCallIds.push(call.id);
  return call;
}

// La section des appels n'apparait qu'une fois un numero attribue : le test
// en pose un le temps de s'executer, puis rend la solution dans son etat.
const restoreNumbers: { id: string; externalPhoneNumber: string | null }[] = [];

async function withPhoneNumber(clientServiceId: string) {
  const current = await db.clientService.findUniqueOrThrow({
    where: { id: clientServiceId },
    select: { externalPhoneNumber: true },
  });
  restoreNumbers.push({ id: clientServiceId, externalPhoneNumber: current.externalPhoneNumber });
  if (!current.externalPhoneNumber) {
    await db.clientService.update({
      where: { id: clientServiceId },
      data: { externalPhoneNumber: `+3399${Date.now().toString().slice(-7)}` },
    });
  }
}

test.afterEach(async () => {
  await db.usageEvent.deleteMany({ where: { id: { in: createdCallIds.splice(0) } } });
  for (const { id, externalPhoneNumber } of restoreNumbers.splice(0)) {
    await db.clientService.update({ where: { id }, data: { externalPhoneNumber } });
  }
});

test("un appel traité se lit en résumé, puis en transcription", async ({ page }) => {
  const { id } = await clientServiceOf(CLIENT.email, "standard-telephonique-ia");
  await withPhoneNumber(id);
  await seedSummarizedCall(id);

  await page.goto(`/dashboard/services/${id}`);
  const call = page.getByRole("button", { name: /Fuite sous l'évier, intervention urgente/ });
  await expect(call).toBeVisible();
  await expect(call).toContainText("Message pris");
  await expect(call).toHaveAttribute("aria-expanded", "false");

  await call.click();
  await expect(call).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("souhaite une intervention aujourd'hui")).toBeVisible();
  await expect(page.getByText("Rappeler Mme Durand avant 18 h")).toBeVisible();

  // La liste est rafraichie toutes les 5 s : l'appel ouvert doit le rester.
  await page.waitForTimeout(5_500);
  await expect(call).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("button", { name: "Voir la transcription" }).click();
  const transcript = page.getByRole("list", { name: "Transcription de l'appel" });
  await expect(transcript).toContainText("Bonjour, j'ai une fuite sous l'évier.");
  await expect(transcript).toContainText("Plomberie Lefèvre, bonjour.");
});

test("la transcription d'une autre entreprise reste inaccessible", async ({ page }) => {
  const other = await db.clientService.findFirstOrThrow({
    where: { organization: { members: { none: { user: { email: CLIENT.email } } } } },
    select: { id: true },
  });
  const foreignCall = await seedSummarizedCall(other.id);
  const own = await clientServiceOf(CLIENT.email, "standard-telephonique-ia");

  // Ni par la solution d'origine, ni en glissant l'appel sous sa propre solution.
  const direct = await page.request.get(`/api/client-services/${other.id}/calls/${foreignCall.id}`);
  expect(direct.status()).toBe(404);
  const smuggled = await page.request.get(`/api/client-services/${own.id}/calls/${foreignCall.id}`);
  expect(smuggled.status()).toBe(404);
});
