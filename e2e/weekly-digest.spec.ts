import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { ANONYMOUS } from "./roles";

const CRON_AUTH = { authorization: "Bearer secret-de-test-du-cron" };

test.use({ storageState: ANONYMOUS });
test.describe.configure({ mode: "serial" });

let previous: { id: string; lastWeeklyDigestAt: Date | null }[] = [];

test.beforeEach(async () => {
  previous = await db.organization.findMany({ select: { id: true, lastWeeklyDigestAt: true } });
  await db.organization.updateMany({ data: { lastWeeklyDigestAt: null } });
});

test.afterEach(async () => {
  for (const { id, lastWeeklyDigestAt } of previous) {
    await db.organization.update({ where: { id }, data: { lastWeeklyDigestAt } });
  }
});

test("la route du bilan refuse qui n'a pas le secret du cron", async ({ request }) => {
  expect((await request.get("/api/cron/weekly-digest")).status()).toBe(401);
  const wrong = await request.get("/api/cron/weekly-digest", {
    headers: { authorization: "Bearer mauvais-secret" },
  });
  expect(wrong.status()).toBe(401);
});

test("le bilan part une fois par semaine et par entreprise", async ({ request }) => {
  const first = await request.get("/api/cron/weekly-digest", { headers: CRON_AUTH });
  expect(first.status()).toBe(200);
  const firstResult = (await first.json()) as { sent: number; empty: number; skipped: number };
  expect(firstResult.sent + firstResult.empty).toBeGreaterThan(0);
  expect(firstResult.skipped).toBe(0);

  const second = await request.get("/api/cron/weekly-digest", { headers: CRON_AUTH });
  const secondResult = (await second.json()) as { sent: number; empty: number; skipped: number };
  expect(secondResult.sent).toBe(0);
  expect(secondResult.skipped).toBe(firstResult.sent + firstResult.empty);
});
