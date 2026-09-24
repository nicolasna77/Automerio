import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoiceItemsCreate: vi.fn(),
  invoicesCreate: vi.fn(),
  periodOf: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  eventCount: vi.fn(),
  memberFindMany: vi.fn(),
  consumedUnits: vi.fn(),
  calendarMonth: vi.fn(),
  sendQuotaAlertEmail: vi.fn(),
  logServiceEvent: vi.fn(),
}));
const { invoiceItemsCreate, findFirst, consumedUnits } = mocks;

vi.mock("@/lib/stripe", () => ({
  stripeClient: {
    invoiceItems: { create: mocks.invoiceItemsCreate },
    invoices: { create: mocks.invoicesCreate },
    subscriptions: { retrieve: vi.fn() },
  },
}));
vi.mock("@/lib/stripe-billing", () => ({ getIncludedVatRateId: vi.fn().mockResolvedValue("txr_vat") }));
vi.mock("@/lib/db", () => ({
  db: {
    clientService: { findFirst: mocks.findFirst, findUnique: mocks.findUnique },
    serviceEvent: { count: mocks.eventCount },
    member: { findMany: mocks.memberFindMany },
  },
}));
vi.mock("@/lib/email/notifications", () => ({ sendQuotaAlertEmail: mocks.sendQuotaAlertEmail }));
vi.mock("@/lib/service-events", () => ({ logServiceEvent: mocks.logServiceEvent }));
vi.mock("@/lib/subscriptions", () => ({
  consumedUnits: mocks.consumedUnits,
  calendarMonth: mocks.calendarMonth,
  periodOf: mocks.periodOf,
}));

import type Stripe from "stripe";
import {
  billFinalOverage,
  billOverageOnInvoice,
  checkQuotaAlerts,
  overageLineDescription,
  quotaThresholdCrossed,
} from "./overage-billing";

describe("quotaThresholdCrossed", () => {
  it("previent a 80 %, puis au depassement", () => {
    expect(quotaThresholdCrossed(119, 120, 150)).toBe("WARNING");
    expect(quotaThresholdCrossed(149, 151, 150)).toBe("EXCEEDED");
  });

  it("ne previent qu'une fois, du plus grave, si les deux seuils tombent ensemble", () => {
    expect(quotaThresholdCrossed(100, 160, 150)).toBe("EXCEEDED");
  });

  it("se tait hors des franchissements", () => {
    expect(quotaThresholdCrossed(10, 20, 150)).toBeNull();
    expect(quotaThresholdCrossed(121, 130, 150)).toBeNull();
    expect(quotaThresholdCrossed(151, 170, 150)).toBeNull();
    expect(quotaThresholdCrossed(20, 20, 150)).toBeNull();
    expect(quotaThresholdCrossed(0, 5, 0)).toBeNull();
  });
});

describe("overageLineDescription", () => {
  it("dit ce qui est facture et a quel prix", () => {
    expect(
      overageLineDescription(37, { includedUnits: 150, unit: "MINUTE", overageUnitPriceCents: 30 }, "Standard")
    ).toBe("Standard — 37 min au-delà du forfait (0,30 € TTC (0,25 € HT) l'unité)");
  });
});

function invoice(overrides: Partial<Stripe.Invoice> = {}): Stripe.Invoice {
  return {
    id: "in_123",
    status: "draft",
    billing_reason: "subscription_cycle",
    customer: "cus_1",
    period_start: 1_756_684_800,
    period_end: 1_759_276_800,
    parent: { subscription_details: { subscription: "sub_1" } },
    ...overrides,
  } as unknown as Stripe.Invoice;
}

const clientService = {
  id: "cs_1",
  name: "Standard téléphonique",
  includedUsageUnits: 150,
  service: { includedUsageUnits: 150, usageUnit: "MINUTE", overageUnitPriceCents: 30 },
};

describe("billOverageOnInvoice", () => {
  beforeEach(() => {
    invoiceItemsCreate.mockReset();
    findFirst.mockReset().mockResolvedValue(clientService);
    consumedUnits.mockReset();
  });

  it("ajoute le depassement de la periode ecoulee a la facture de renouvellement", async () => {
    consumedUnits.mockResolvedValue(187);
    await billOverageOnInvoice(invoice());

    expect(consumedUnits.mock.calls[0][2]).toEqual({ start: new Date(1_756_684_800_000), end: new Date(1_759_276_800_000) });
    expect(invoiceItemsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_1", invoice: "in_123", currency: "eur", amount: 37 * 30, tax_rates: ["txr_vat"] }),
      { idempotencyKey: "overage-in_123-cs_1" }
    );
  });

  it("ne facture rien sans depassement", async () => {
    consumedUnits.mockResolvedValue(150);
    await billOverageOnInvoice(invoice());
    expect(invoiceItemsCreate).not.toHaveBeenCalled();
  });

  it("ignore les factures qui ne sont pas un renouvellement en brouillon", async () => {
    consumedUnits.mockResolvedValue(300);
    await billOverageOnInvoice(invoice({ billing_reason: "subscription_create" }));
    await billOverageOnInvoice(invoice({ status: "open" }));
    expect(findFirst).not.toHaveBeenCalled();
    expect(invoiceItemsCreate).not.toHaveBeenCalled();
  });

  it("ignore une solution sans prix de depassement", async () => {
    findFirst.mockResolvedValue({
      ...clientService,
      service: { ...clientService.service, overageUnitPriceCents: 0 },
    });
    consumedUnits.mockResolvedValue(300);
    await billOverageOnInvoice(invoice());
    expect(invoiceItemsCreate).not.toHaveBeenCalled();
  });
});

describe("checkQuotaAlerts", () => {
  const period = { start: new Date("2026-09-01"), end: new Date("2026-10-01") };

  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.calendarMonth.mockReturnValue(period);
    mocks.findUnique.mockResolvedValue({
      ...clientService,
      status: "ACTIVE",
      organizationId: "org_1",
      stripeSubscriptionId: null,
    });
    mocks.memberFindMany.mockResolvedValue([
      { user: { email: "a@exemple.fr", name: "A", notificationPreferences: {} } },
    ]);
  });

  it("previent l'equipe quand un appel fait passer 80 %", async () => {
    mocks.consumedUnits.mockResolvedValue(121);
    mocks.eventCount.mockResolvedValue(0);
    await checkQuotaAlerts("cs_1", { durationSec: 130 });

    expect(mocks.logServiceEvent).toHaveBeenCalledWith("cs_1", "QUOTA_WARNING", "121 min sur 150 min");
    expect(mocks.sendQuotaAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@exemple.fr" }),
      expect.objectContaining({ alert: "WARNING", consumed: "121 min", included: "150 min" })
    );
  });

  it("ne previent pas deux fois dans la meme periode", async () => {
    mocks.consumedUnits.mockResolvedValue(121);
    mocks.eventCount.mockResolvedValue(1);
    await checkQuotaAlerts("cs_1", { durationSec: 130 });

    expect(mocks.eventCount).toHaveBeenCalledWith({
      where: { clientServiceId: "cs_1", type: "QUOTA_WARNING", createdAt: { gte: period.start } },
    });
    expect(mocks.sendQuotaAlertEmail).not.toHaveBeenCalled();
  });

  it("se tait tant qu'aucun seuil n'est franchi, ou pour une solution inactive", async () => {
    mocks.consumedUnits.mockResolvedValue(60);
    await checkQuotaAlerts("cs_1", { durationSec: 90 });
    mocks.findUnique.mockResolvedValue({ ...clientService, status: "CANCELED" });
    await checkQuotaAlerts("cs_1", { durationSec: 9000 });

    expect(mocks.eventCount).not.toHaveBeenCalled();
    expect(mocks.sendQuotaAlertEmail).not.toHaveBeenCalled();
  });
});

describe("billFinalOverage", () => {
  const start = new Date("2026-09-01T00:00:00Z");
  const ended = new Date("2026-09-20T00:00:00Z");
  const subscription = {
    id: "sub_1",
    customer: "cus_1",
    ended_at: ended.getTime() / 1000,
    default_payment_method: "pm_1",
  } as unknown as Stripe.Subscription;

  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.findFirst.mockResolvedValue(clientService);
    mocks.periodOf.mockReturnValue({ start, end: new Date("2026-10-01T00:00:00Z") });
    mocks.invoicesCreate.mockResolvedValue({ id: "in_final" });
  });

  it("facture le depassement jusqu'a la fin de l'abonnement, sur une facture a part", async () => {
    mocks.consumedUnits.mockResolvedValue(160);
    await billFinalOverage(subscription);

    expect(mocks.consumedUnits.mock.calls[0][2]).toEqual({ start, end: ended });
    expect(mocks.invoicesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_1",
        default_payment_method: "pm_1",
        pending_invoice_items_behavior: "exclude",
      }),
      { idempotencyKey: "final-overage-invoice-sub_1" }
    );
    expect(mocks.invoiceItemsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ invoice: "in_final", amount: 10 * 30 }),
      { idempotencyKey: "final-overage-sub_1" }
    );
  });

  it("ne cree aucune facture sans depassement", async () => {
    mocks.consumedUnits.mockResolvedValue(90);
    await billFinalOverage(subscription);
    expect(mocks.invoicesCreate).not.toHaveBeenCalled();
    expect(mocks.invoiceItemsCreate).not.toHaveBeenCalled();
  });
});
