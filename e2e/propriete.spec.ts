import { expect, test } from "@playwright/test";
import { db } from "@/lib/db";
import { CLIENT, CLIENT_STATE } from "./roles";

test.use({ storageState: CLIENT_STATE });

const TEAMMATE_EMAIL_PREFIX = "e2e-coequipier-";

let restore: (() => Promise<void>) | null = null;

test.afterEach(async () => {
  await restore?.();
  restore = null;
});

test("le propriétaire transmet la propriété et reste responsable", async ({ page }) => {
  const owner = await db.member.findFirstOrThrow({
    where: { user: { email: CLIENT.email }, role: { contains: "owner" } },
    select: { id: true, role: true, organizationId: true },
  });
  const teammate = await db.user.create({
    data: {
      id: `e2e-coequipier-${Date.now()}`,
      name: "Sophie Coéquipière",
      email: `${TEAMMATE_EMAIL_PREFIX}${Date.now()}@example.com`,
      emailVerified: true,
      members: {
        create: {
          id: `e2e-membre-${Date.now()}`,
          organizationId: owner.organizationId,
          role: "member",
          createdAt: new Date(),
        },
      },
    },
    select: { id: true },
  });
  restore = async () => {
    await db.member.update({ where: { id: owner.id }, data: { role: owner.role } });
    await db.user.delete({ where: { id: teammate.id } });
  };

  await page.goto("/dashboard/organisation");
  await expect(page.getByText("Vous : Propriétaire")).toBeVisible();

  await page.getByRole("button", { name: "Transmettre la propriété" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Vous resterez responsable");
  await dialog.getByRole("button", { name: "Transmettre" }).click();

  await expect(page.getByText("Vous : Responsable")).toBeVisible();
  // Le bouton disparait : seul le nouveau proprietaire peut transmettre a nouveau.
  await expect(page.getByRole("button", { name: "Transmettre la propriété" })).toHaveCount(0);

  const roles = await db.member.findMany({
    where: { organizationId: owner.organizationId, id: { in: [owner.id] } },
    select: { role: true },
  });
  expect(roles[0].role).toBe("admin");
  const newOwner = await db.member.findFirstOrThrow({
    where: { organizationId: owner.organizationId, userId: teammate.id },
    select: { role: true },
  });
  expect(newOwner.role).toBe("owner");
});
