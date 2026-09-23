"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/auth";
import { getSession } from "@/lib/session";
import {
  findMissingRequiredField,
  TELEPHONY_SERVICE_SLUGS,
  withCleanProductCatalog,
  type ConfigField,
  type Configuration,
} from "@/lib/catalog";
import { logServiceEvent } from "@/lib/service-events";
import {
  purchasePhoneNumber,
  releasePhoneNumber,
  searchAvailableNumbers,
} from "@/lib/twilio";
import {
  fetchDisplayPhoneNumber,
  registerPhoneNumber,
  subscribeAppToWaba,
} from "@/lib/whatsapp";
import { exchangeMetaEmbeddedSignupCode } from "@/lib/meta";
import { fetchManagedPage, subscribePageToApp } from "@/lib/messenger";
import { sendServiceCanceledEmail } from "@/lib/email/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { validatePromoCodeForService } from "@/lib/stripe-promo-codes";
import { applyDiscount, describeDiscount, firstPaymentCents } from "@/lib/promo-codes";
import { ActionError, runAction } from "@/lib/run-action";
import {
  getOrCreateOrganizationCustomer,
  organizationCustomerId,
} from "@/lib/organization-billing";
import {
  canManageClientServiceBilling,
  canReadClientService,
  viewerOf,
} from "@/lib/client-service-access";
import { createBillingPortalUrl, getIncludedVatRateId } from "@/lib/stripe-billing";

const CHECKOUT_INTEGRATION_ID = "automerio-activation-qkzmtwph";

const TOO_MANY_ATTEMPTS = "Trop d'essais. Réessayez dans quelques minutes.";
const CHECKOUT_UNAVAILABLE =
  "Le paiement n'a pas pu être préparé. Réessayez depuis « Mes solutions ».";

async function requireUserId() {
  const session = await getSession();
  if (!session) throw new ActionError("Votre session a expiré. Reconnectez-vous.");
  return session.user.id;
}

/** Consulter et configurer : il suffit d'appartenir a l'organisation porteuse. */
async function requireMemberOn(
  clientService: { organizationId: string },
  userId: string
) {
  if (!canReadClientService(clientService, await viewerOf(userId))) {
    throw new ActionError("Cette solution n'appartient pas à votre organisation.");
  }
}

/**
 * Engager de l'argent ou couper un service en marche : l'appartenance ne
 * suffit plus, il faut le role. Le message distingue les deux refus — un
 * membre a qui l'on dit « cette solution n'existe pas » cherchera le probleme
 * au mauvais endroit.
 */
async function requireBillingRoleOn(
  clientService: { organizationId: string },
  userId: string
) {
  const viewer = await viewerOf(userId);
  if (!canReadClientService(clientService, viewer)) {
    throw new ActionError("Cette solution n'appartient pas à votre organisation.");
  }
  if (!canManageClientServiceBilling(clientService, viewer)) {
    throw new ActionError(
      "Seuls les responsables de l'organisation peuvent effectuer cette action."
    );
  }
}

const appUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function revalidateDashboard(clientServiceId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/prestations");
  if (clientServiceId) revalidatePath(`/dashboard/services/${clientServiceId}`);
}

function isPromotionError(err: unknown): boolean {
  const { code, param } = (err ?? {}) as { code?: string; param?: string };
  return Boolean(
    code?.startsWith("promotion_code") || code?.startsWith("coupon") || param?.startsWith("discounts")
  );
}

function promotionErrorMessage(err: unknown): string {
  return (err as { code?: string }).code === "promotion_code_customer_not_first_time"
    ? "Ce code est réservé aux nouveaux clients. Retirez-le pour payer au tarif normal."
    : "Ce code ne peut pas être utilisé avec votre compte. Retirez-le pour payer au tarif normal.";
}

async function createCheckoutSession(
  clientServiceId: string,
  organizationId: string,
  service: {
    id: string;
    name: string;
    setupFeeCents: number | null;
    monthlyPriceCents: number | null;
  },
  user: { email: string },
  promotionCodeId: string | null = null
): Promise<string> {
  // Le client Stripe appartient a l'organisation : c'est elle qui achete,
  // et ses factures doivent rester visibles de tous ses membres.
  const customerId = await getOrCreateOrganizationCustomer(
    organizationId,
    user.email
  );
  const vatRateId = await getIncludedVatRateId();
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  if (service.setupFeeCents !== null) {
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: service.setupFeeCents,
        product_data: { name: `${service.name} — mise en place` },
      },
      quantity: 1,
      tax_rates: [vatRateId],
    });
  }
  if (service.monthlyPriceCents !== null) {
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: service.monthlyPriceCents,
        recurring: { interval: "month" },
        product_data: { name: service.name },
      },
      quantity: 1,
      tax_rates: [vatRateId],
    });
  }

  const mode = service.monthlyPriceCents !== null ? "subscription" : "payment";
  const checkoutSession = await stripeClient.checkout.sessions.create({
    mode,
    integration_identifier: CHECKOUT_INTEGRATION_ID,
    customer: customerId,
    line_items: lineItems,
    ...(promotionCodeId && { discounts: [{ promotion_code: promotionCodeId }] }),
    ...(mode === "payment" && {
      invoice_creation: {
        enabled: true,
        invoice_data: { metadata: { clientServiceId } },
      },
    }),
    metadata: { clientServiceId, serviceId: service.id },
    success_url: `${appUrl()}/dashboard/prestations?checkout=success&clientServiceId=${clientServiceId}`,
    cancel_url: `${appUrl()}/dashboard/prestations?checkout=canceled&clientServiceId=${clientServiceId}`,
  });

  await db.clientService.update({
    where: { id: clientServiceId },
    data: { stripeCheckoutSessionId: checkoutSession.id },
  });

  return checkoutSession.url!;
}

export async function activateService(
  serviceId: string,
  organizationId: string,
  name: string,
  configuration: Configuration,
  promoCode: string | null = null
) {
  return runAction(async () => {
    const userId = await requireUserId();
    if (!(await checkRateLimit("service-activation", userId, "10 m", 10))) {
      throw new ActionError(TOO_MANY_ATTEMPTS);
    }
    const [service, user] = await Promise.all([
      db.service.findUniqueOrThrow({ where: { id: serviceId } }),
      db.user.findUniqueOrThrow({ where: { id: userId } }),
    ]);
    await requireBillingRoleOn({ organizationId }, userId);

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new ActionError("Merci de donner un nom à cette activation.");
    }

    const configFields = (service.configFields as ConfigField[]) ?? [];
    const missing = findMissingRequiredField(configFields, configuration);
    if (missing) {
      throw new ActionError(`Le champ « ${missing.label} » est requis.`);
    }

    let promotion: { promotionCodeId: string; code: string } | null = null;
    if (promoCode?.trim()) {
      const result = await validatePromoCodeForService(promoCode, service.slug);
      if (!result.ok) throw new ActionError(result.reason);
      promotion = { promotionCodeId: result.promotionCodeId, code: result.code };
    }

    let clientService;
    try {
      clientService = await db.clientService.create({
        data: {
          userId,
          organizationId,
          serviceId,
          name: trimmedName,
          status: "PENDING_PAYMENT",
          configuration: withCleanProductCatalog(configuration),
          promoCode: promotion?.code ?? null,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ActionError(
          `Vous avez déjà une solution nommée « ${trimmedName} » pour ce service dans cette organisation.`
        );
      }
      throw err;
    }

    await logServiceEvent(clientService.id, "CREATED");

    try {
      const checkoutUrl = await createCheckoutSession(
        clientService.id,
        organizationId,
        service,
        user,
        promotion?.promotionCodeId ?? null
      );
      revalidateDashboard(clientService.id);
      return { checkoutUrl };
    } catch (err) {
      if (promotion && isPromotionError(err)) {
        await db.clientService.delete({ where: { id: clientService.id } });
        throw new ActionError(promotionErrorMessage(err));
      }
      console.error("[paiement] session Checkout impossible à créer :", err);
      revalidateDashboard(clientService.id);
      throw new ActionError(CHECKOUT_UNAVAILABLE);
    }
  });
}

export async function resumeServiceCheckout(
  clientServiceId: string,
  newPromoCode: string | null = null
) {
  return runAction(async () => {
    const [userId, clientService] = await Promise.all([
      requireUserId(),
      db.clientService.findUniqueOrThrow({
        where: { id: clientServiceId },
        include: { service: true },
      }),
    ]);

    await requireBillingRoleOn(clientService, userId);
    if (clientService.status !== "PENDING_PAYMENT" && clientService.status !== "CANCELED") {
      throw new ActionError("Cette solution est déjà active.");
    }

    const explicitCode = newPromoCode?.trim() || null;
    if (explicitCode && !(await checkRateLimit("promo-code-preview", userId, "10 m", 20))) {
      throw new ActionError(TOO_MANY_ATTEMPTS);
    }

    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

    let promotion: { promotionCodeId: string; code: string } | null = null;
    if (explicitCode) {
      const result = await validatePromoCodeForService(explicitCode, clientService.service.slug);
      if (!result.ok) throw new ActionError(result.reason);
      promotion = { promotionCodeId: result.promotionCodeId, code: result.code };
    } else if (clientService.status === "PENDING_PAYMENT" && clientService.promoCode) {
      const result = await validatePromoCodeForService(
        clientService.promoCode,
        clientService.service.slug
      );
      if (result.ok) promotion = { promotionCodeId: result.promotionCodeId, code: result.code };
    }

    await db.clientService.update({
      where: { id: clientServiceId },
      data: { status: "PENDING_PAYMENT", canceledAt: null, promoCode: promotion?.code ?? null },
    });

    let checkoutUrl: string;
    try {
      checkoutUrl = await createCheckoutSession(
        clientService.id,
        clientService.organizationId,
        clientService.service,
        user,
        promotion?.promotionCodeId ?? null
      );
    } catch (err) {
      if (!promotion || !isPromotionError(err)) {
        console.error("[paiement] session Checkout impossible à créer :", err);
        throw new ActionError(CHECKOUT_UNAVAILABLE);
      }
      await db.clientService.update({ where: { id: clientServiceId }, data: { promoCode: null } });
      if (explicitCode) throw new ActionError(promotionErrorMessage(err));
      checkoutUrl = await createCheckoutSession(
        clientService.id,
        clientService.organizationId,
        clientService.service,
        user
      );
    }
    revalidateDashboard(clientService.id);
    return { checkoutUrl };
  });
}

export type PromoPreview =
  | {
      ok: true;
      code: string;
      description: string;
      firstPaymentCents: number;
      discountedFirstPaymentCents: number;
    }
  | { ok: false; reason: string };

export async function previewPromoCode(serviceId: string, code: string): Promise<PromoPreview> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "Votre session a expiré. Reconnectez-vous." };
  if (!(await checkRateLimit("promo-code-preview", session.user.id, "10 m", 20))) {
    return { ok: false, reason: TOO_MANY_ATTEMPTS };
  }

  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service) return { ok: false, reason: "Cette solution n'existe plus." };
  const result = await validatePromoCodeForService(code, service.slug);
  if (!result.ok) return result;

  const first = firstPaymentCents(service);
  return {
    ok: true,
    code: result.code,
    description: describeDiscount(result.rule, {
      hasSetupFee: service.setupFeeCents !== null,
      hasSubscription: service.monthlyPriceCents !== null,
    }),
    firstPaymentCents: first,
    discountedFirstPaymentCents: applyDiscount(first, result.rule),
  };
}

export async function updateServiceConfiguration(
  clientServiceId: string,
  configuration: Configuration
) {
  return runAction(async () => {
    const [userId, clientService] = await Promise.all([
      requireUserId(),
      db.clientService.findUniqueOrThrow({
        where: { id: clientServiceId },
        include: { service: true },
      }),
    ]);
    await requireMemberOn(clientService, userId);

    const configFields =
      (clientService.service.configFields as ConfigField[]) ?? [];
    const missing = findMissingRequiredField(configFields, configuration);
    if (missing) {
      throw new ActionError(`Le champ « ${missing.label} » est requis.`);
    }

    await db.clientService.update({
      where: { id: clientServiceId },
      data: { configuration: withCleanProductCatalog(configuration) },
    });
    await logServiceEvent(clientServiceId, "CONFIGURATION_UPDATED");

    revalidateDashboard(clientServiceId);
  });
}

export async function disconnectGoogleCalendar(clientServiceId: string) {
  return runAction(async () => {
    const [userId, clientService] = await Promise.all([
      requireUserId(),
      db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
    ]);
    await requireMemberOn(clientService, userId);

    const { count } = await db.calendarConnection.deleteMany({ where: { clientServiceId } });
    if (count > 0) await logServiceEvent(clientServiceId, "CALENDAR_DISCONNECTED");
    revalidateDashboard(clientServiceId);
  });
}

export async function completeWhatsAppEmbeddedSignup(
  clientServiceId: string,
  code: string,
  wabaId: string,
  phoneNumberId: string
) {
  return runAction(async () => {
    const [userId, clientService] = await Promise.all([
      requireUserId(),
      db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
    ]);
    await requireMemberOn(clientService, userId);

    const accessToken = await exchangeMetaEmbeddedSignupCode(code);
    await subscribeAppToWaba(wabaId, accessToken);
    await registerPhoneNumber(phoneNumberId, accessToken);
    const displayNumber = await fetchDisplayPhoneNumber(phoneNumberId, accessToken);

    await db.clientService.update({
      where: { id: clientServiceId },
      data: {
        whatsappPhoneNumberId: phoneNumberId,
        whatsappBusinessAccountId: wabaId,
        whatsappAccessToken: accessToken,
        whatsappDisplayNumber: displayNumber,
      },
    });
    await logServiceEvent(clientServiceId, "WHATSAPP_CONNECTED", displayNumber);
    revalidateDashboard(clientServiceId);
  });
}

export async function disconnectWhatsApp(clientServiceId: string) {
  return runAction(async () => {
    const [userId, clientService] = await Promise.all([
      requireUserId(),
      db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
    ]);
    await requireMemberOn(clientService, userId);

    await db.clientService.update({
      where: { id: clientServiceId },
      data: {
        whatsappPhoneNumberId: null,
        whatsappBusinessAccountId: null,
        whatsappAccessToken: null,
        whatsappDisplayNumber: null,
      },
    });
    await logServiceEvent(clientServiceId, "WHATSAPP_DISCONNECTED");
    revalidateDashboard(clientServiceId);
  });
}

export async function completeMessengerConnection(clientServiceId: string, code: string) {
  return runAction(async () => {
    const [userId, clientService] = await Promise.all([
      requireUserId(),
      db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
    ]);
    await requireMemberOn(clientService, userId);

    const userAccessToken = await exchangeMetaEmbeddedSignupCode(code);
    const page = await fetchManagedPage(userAccessToken);
    if (!page) {
      throw new ActionError(
        "Aucune Page Facebook trouvée — vérifiez que vous en gérez au moins une."
      );
    }
    await subscribePageToApp(page.id, page.access_token);

    await db.clientService.update({
      where: { id: clientServiceId },
      data: {
        facebookPageId: page.id,
        facebookPageAccessToken: page.access_token,
        facebookPageName: page.name,
      },
    });
    await logServiceEvent(clientServiceId, "FACEBOOK_CONNECTED", page.name);
    revalidateDashboard(clientServiceId);
  });
}

export async function disconnectMessenger(clientServiceId: string) {
  return runAction(async () => {
    const [userId, clientService] = await Promise.all([
      requireUserId(),
      db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
    ]);
    await requireMemberOn(clientService, userId);

    await db.clientService.update({
      where: { id: clientServiceId },
      data: {
        facebookPageId: null,
        facebookPageAccessToken: null,
        facebookPageName: null,
      },
    });
    await logServiceEvent(clientServiceId, "FACEBOOK_DISCONNECTED");
    revalidateDashboard(clientServiceId);
  });
}

export async function disconnectInstagram(clientServiceId: string) {
  return runAction(async () => {
    const [userId, clientService] = await Promise.all([
      requireUserId(),
      db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
    ]);
    await requireMemberOn(clientService, userId);

    await db.clientService.update({
      where: { id: clientServiceId },
      data: {
        instagramAccountId: null,
        instagramAccessToken: null,
        instagramTokenExpiresAt: null,
        instagramUsername: null,
      },
    });
    await logServiceEvent(clientServiceId, "INSTAGRAM_DISCONNECTED");
    revalidateDashboard(clientServiceId);
  });
}

async function requireOwnedTelephonyService(
  clientServiceId: string,
  userId: string
) {
  const clientService = await db.clientService.findUniqueOrThrow({
    where: { id: clientServiceId },
    include: { service: true },
  });
  await requireBillingRoleOn(clientService, userId);
  if (!TELEPHONY_SERVICE_SLUGS.has(clientService.service.slug)) {
    throw new ActionError("Cette solution ne prend pas de numéro de téléphone.");
  }
  if (clientService.status !== "CONFIGURING" && clientService.status !== "ACTIVE") {
    throw new ActionError("La solution doit être payée avant de choisir un numéro.");
  }
  if (clientService.externalPhoneNumber) {
    throw new ActionError("Un numéro est déjà assigné à cette solution.");
  }
  return clientService;
}

export async function searchPhoneNumbers(clientServiceId: string) {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnedTelephonyService(clientServiceId, userId);
    return searchAvailableNumbers();
  });
}

export async function purchasePhoneNumberForService(
  clientServiceId: string,
  phoneNumber: string
) {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnedTelephonyService(clientServiceId, userId);

    const purchased = await purchasePhoneNumber(phoneNumber);

    const { count } = await db.clientService.updateMany({
      where: { id: clientServiceId, externalPhoneNumber: null },
      data: {
        externalPhoneNumber: purchased.phoneNumber,
        externalPhoneNumberSid: purchased.sid,
      },
    });
    if (count === 0) {
      await releasePhoneNumber(purchased.sid);
      throw new ActionError("Un numéro a déjà été assigné à cette solution entre-temps.");
    }
    await logServiceEvent(clientServiceId, "PHONE_ASSIGNED", purchased.phoneNumber);

    revalidateDashboard(clientServiceId);
  });
}

export async function cancelService(clientServiceId: string) {
  return runAction(async () => {
    const [userId, clientService] = await Promise.all([
      requireUserId(),
      db.clientService.findUniqueOrThrow({
        where: { id: clientServiceId },
        include: { user: true },
      }),
    ]);
    await requireBillingRoleOn(clientService, userId);

    if (clientService.stripeSubscriptionId) {
      try {
        await stripeClient.subscriptions.cancel(clientService.stripeSubscriptionId);
      } catch (err) {
        console.error("[paiement] résiliation Stripe impossible :", err);
      }
    }

    if (clientService.externalPhoneNumberSid) {
      await releasePhoneNumber(clientService.externalPhoneNumberSid);
    }

    await db.clientService.update({
      where: { id: clientServiceId },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        externalPhoneNumber: null,
        externalPhoneNumberSid: null,
      },
    });
    await logServiceEvent(clientServiceId, "CANCELED");
    await sendServiceCanceledEmail(
      {
        email: clientService.user.email,
        name: clientService.user.name,
        notificationPreferences: clientService.user.notificationPreferences,
      },
      clientService.name
    );

    revalidateDashboard(clientServiceId);
  });
}

/**
 * Le portail Stripe donne la main sur le moyen de paiement et les factures de
 * l'entreprise : il se reserve donc aux memes roles que la resiliation et
 * l'achat, et non a tout membre.
 */
export async function openBillingPortal(organizationId: string) {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireBillingRoleOn({ organizationId }, userId);

    const customerId = await organizationCustomerId(organizationId);
    if (!customerId) {
      throw new ActionError(
        "Aucun moyen de paiement n'est encore enregistré pour cette entreprise."
      );
    }
    const url = await createBillingPortalUrl(customerId, `${appUrl()}/dashboard/paiements`);
    return { url };
  });
}
