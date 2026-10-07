import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
  releasePhoneNumber: vi.fn(),
  logServiceEvent: vi.fn(),
  sendServiceCanceledEmail: vi.fn(),
  billFinalOverage: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { clientService: { findMany: mocks.findMany, updateMany: mocks.updateMany } },
}));
vi.mock("@/lib/stripe", () => ({ stripeClient: { subscriptions: { cancel: vi.fn() } } }));
vi.mock("@/lib/twilio", () => ({ releasePhoneNumber: mocks.releasePhoneNumber }));
vi.mock("@/lib/service-events", () => ({ logServiceEvent: mocks.logServiceEvent }));
vi.mock("@/lib/email/notifications", () => ({
  sendPaymentFailedEmail: vi.fn(),
  sendServiceCanceledEmail: mocks.sendServiceCanceledEmail,
}));
vi.mock("@/lib/overage-billing", () => ({
  billFinalOverage: mocks.billFinalOverage,
  billOverageOnInvoice: vi.fn(),
}));

import type Stripe from "stripe";
import { handleStripeEvent } from "./stripe-webhooks";
import { CLEARED_META_CONNECTION } from "./meta-connection";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.billFinalOverage.mockResolvedValue(undefined);
  mocks.updateMany.mockResolvedValue({ count: 1 });
});

describe("résiliation par Stripe", () => {
  it("libère le numéro WhatsApp, la page Facebook et le compte Instagram", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "cs_1", name: "WhatsApp", externalPhoneNumberSid: null, user: { email: "a@b.fr" } },
    ]);

    await handleStripeEvent({
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_1" } },
    } as unknown as Stripe.Event);

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["cs_1"] } },
      data: expect.objectContaining({ status: "CANCELED", ...CLEARED_META_CONNECTION }),
    });
    expect(mocks.logServiceEvent).toHaveBeenCalledWith("cs_1", "CANCELED");
  });
});
