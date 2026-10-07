"use server";

import { readClientUsageCap } from "@/lib/usage-cap";
import { revalidatePath } from "next/cache";
import { CLEARED_META_CONNECTION, isUniqueViolation } from "@/lib/meta-connection";
import { getTranslations } from "next-intl/server";
import { settingsHiddenKeys } from "./field-categories";
import { Prisma } from "@prisma/client";
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
  isFrenchE164,
  PhoneNumberUnavailableError,
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
import { whatsAppNumberBelongsToToken } from "@/lib/meta-accounts";
import { sendServiceCanceledEmail } from "@/lib/email/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { sealSecret } from "@/lib/secret-box";
import { readCalcomAccount } from "@/lib/scheduling/calcom";
import { readCalendlyAccount } from "@/lib/scheduling/calendly";
import {
  isSchedulingProvider,
  PROVIDER_LABELS,
  SchedulingError,
  type ProviderAccount,
  type SchedulingProvider,
} from "@/lib/scheduling/types";
import { validatePromoCodeForService } from "@/lib/stripe-promo-codes";
import { applyDiscount, describeDiscount, firstPaymentCents } from "@/lib/promo-codes";
import { ActionError, actionError, runAction } from "@/lib/run-action";
import {
  getOrCreateOrganizationCustomer,
  organizationCustomerId,
} from "@/lib/organization-billing";
import { applyMonthlyPriceChange } from "@/lib/subscription-changes";
import {
  calculateMonthlyPriceCents,
  isValidUnitSelection,
  readSubscriptionTier,
} from "@/lib/subscription-pricing";
import {
  canManageClientServiceBilling,
  canReadClientService,
  viewerOf,
} from "@/lib/client-service-access";
import { createBillingPortalUrl, getIncludedVatRateId } from "@/lib/stripe-billing";

const CHECKOUT_INTEGRATION_ID = "automerio-activation-qkzmtwph";


async function requireUserId() {
  const session = await getSession();
  if (!session) throw actionError("sessionExpired");
  return session.user.id;
}

function agreedPricing(clientService: {
  monthlyPriceCents: number | null;
  service: { id: string; name: string; monthlyPriceCents: number | null };
}) {
  return {
    ...clientService.service,
    monthlyPriceCents:
      clientService.monthlyPriceCents ?? clientService.service.monthlyPriceCents,
  };
}

async function requireMemberOn(
  clientService: { organizationId: string },
  userId: string
) {
  if (!canReadClientService(clientService, await viewerOf(userId))) {
    throw actionError("notYourService");
  }
}

async function requireBillingRoleOn(
  clientService: { organizationId: string },
  userId: string
) {
  const viewer = await viewerOf(userId);
  if (!canReadClientService(clientService, viewer)) {
    throw actionError("notYourService");
  }
  if (!canManageClientServiceBilling(clientService, viewer)) {
    throw actionError("managersOnly");
  }
}

const appUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function revalidateDashboard(clientServiceId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/services");
  if (clientServiceId) revalidatePath(`/dashboard/services/${clientServiceId}`);
}

function isPromotionError(err: unknown): boolean {
  const { code, param } = (err ?? {}) as { code?: string; param?: string };
  return Boolean(
    code?.startsWith("promotion_code") || code?.startsWith("coupon") || param?.startsWith("discounts")
  );
}

function promotionError(err: unknown) {
  return actionError(
    (err as { code?: string }).code === "promotion_code_customer_not_first_time"
      ? "promoNewCustomersOnly"
      : "promoNotAllowed"
  );
}

async function createCheckoutSession(
  clientServiceId: string,
  organizationId: string,
  service: {
    id: string;
    name: string;
    monthlyPriceCents: number | null;
  },
  user: { email: string },
  promotionCodeId: string | null = null
): Promise<string> {
  const customerId = await getOrCreateOrganizationCustomer(
    organizationId,
    user.email
  );
  const vatRateId = await getIncludedVatRateId();
  if (service.monthlyPriceCents === null) {
    throw actionError("noPrice");
  }

  const checkoutSession = await stripeClient.checkout.sessions.create({
    mode: "subscription",
    integration_identifier: CHECKOUT_INTEGRATION_ID,
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: service.monthlyPriceCents,
          recurring: { interval: "month" },
          product_data: { name: service.name },
        },
        quantity: 1,
        tax_rates: [vatRateId],
      },
    ],
    ...(promotionCodeId && { discounts: [{ promotion_code: promotionCodeId }] }),
    metadata: { clientServiceId, serviceId: service.id },
    success_url: `${appUrl()}/dashboard/services?checkout=success&clientServiceId=${clientServiceId}`,
    cancel_url: `${appUrl()}/dashboard/services?checkout=canceled&clientServiceId=${clientServiceId}`,
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
  promoCode: string | null = null,
  chosenUnits: number | null = null
) {
  return runAction(async () => {
    const userId = await requireUserId();
    if (!(await checkRateLimit("service-activation", userId, "10 m", 10))) {
      throw actionError("tooManyAttempts");
    }
    const [service, user] = await Promise.all([
      db.service.findUniqueOrThrow({ where: { id: serviceId } }),
      db.user.findUniqueOrThrow({ where: { id: userId } }),
    ]);
    await requireBillingRoleOn({ organizationId }, userId);

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw actionError("activationNameRequired");
    }

    const tier = readSubscriptionTier(service);
    let includedUsageUnits: number | null = null;
    let monthlyPriceCents: number | null = null;
    if (tier) {
      const units = chosenUnits ?? tier.minUnits;
      if (!isValidUnitSelection(tier, units)) {
        throw actionError("volumeNotOffered");
      }
      includedUsageUnits = units;
      monthlyPriceCents = calculateMonthlyPriceCents(tier, units);
    }

    const hidden = settingsHiddenKeys(service.slug);
    const configFields = ((service.configFields as ConfigField[]) ?? []).filter(
      (field) => !hidden.includes(field.key)
    );
    const missing = findMissingRequiredField(configFields, configuration);
    if (missing) {
      throw actionError("fieldRequired", { label: missing.label });
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
          includedUsageUnits,
          monthlyPriceCents,
          promoCode: promotion?.code ?? null,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw actionError("duplicateName", { name: trimmedName });
      }
      throw err;
    }

    await logServiceEvent(clientService.id, "CREATED");

    try {
      const checkoutUrl = await createCheckoutSession(
        clientService.id,
        organizationId,
        { ...service, monthlyPriceCents: monthlyPriceCents ?? service.monthlyPriceCents },
        user,
        promotion?.promotionCodeId ?? null
      );
      revalidateDashboard(clientService.id);
      return { checkoutUrl };
    } catch (err) {
      if (promotion && isPromotionError(err)) {
        await db.clientService.delete({ where: { id: clientService.id } });
        throw promotionError(err);
      }
      console.error("[paiement] session Checkout impossible à créer :", err);
      revalidateDashboard(clientService.id);
      throw actionError("checkoutUnavailable");
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
      throw actionError("alreadyActive");
    }

    const explicitCode = newPromoCode?.trim() || null;
    if (explicitCode && !(await checkRateLimit("promo-code-preview", userId, "10 m", 20))) {
      throw actionError("tooManyAttempts");
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
        agreedPricing(clientService),
        user,
        promotion?.promotionCodeId ?? null
      );
    } catch (err) {
      if (!promotion || !isPromotionError(err)) {
        console.error("[paiement] session Checkout impossible à créer :", err);
        throw actionError("checkoutUnavailable");
      }
      await db.clientService.update({ where: { id: clientServiceId }, data: { promoCode: null } });
      if (explicitCode) throw promotionError(err);
      checkoutUrl = await createCheckoutSession(
        clientService.id,
        clientService.organizationId,
        agreedPricing(clientService),
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
  const t = await getTranslations("Actions");
  if (!session) return { ok: false, reason: t("sessionExpired") };
  if (!(await checkRateLimit("promo-code-preview", session.user.id, "10 m", 20))) {
    return { ok: false, reason: t("tooManyAttempts") };
  }

  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service) return { ok: false, reason: t("serviceGone") };
  const result = await validatePromoCodeForService(code, service.slug);
  if (!result.ok) return result;

  const first = firstPaymentCents(service);
  return {
    ok: true,
    code: result.code,
    description: describeDiscount(result.rule),
    firstPaymentCents: first,
    discountedFirstPaymentCents: applyDiscount(first, result.rule),
  };
}

export async function updateServiceConfiguration(
  clientServiceId: string,
  configuration: Configuration,
  name?: string
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

    // Les champs que les réglages ne proposent plus ne sont pas exigés.
    const hidden = settingsHiddenKeys(clientService.service.slug);
    const configFields = ((clientService.service.configFields as ConfigField[]) ?? []).filter(
      (field) => !hidden.includes(field.key)
    );
    const missing = findMissingRequiredField(configFields, configuration);
    if (missing) {
      throw actionError("fieldRequired", { label: missing.label });
    }

    const trimmedName = name?.trim();
    if (name !== undefined && !trimmedName) {
      throw actionError("serviceNameRequired");
    }
    if (trimmedName && trimmedName.length > 80) {
      throw actionError("serviceNameTooLong");
    }
    try {
      await db.clientService.update({
        where: { id: clientServiceId },
        data: {
          configuration: withCleanProductCatalog(configuration),
          ...(trimmedName && { name: trimmedName }),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw actionError("duplicateName", { name: trimmedName ?? "" });
      }
      throw err;
    }
    await logServiceEvent(clientServiceId, "CONFIGURATION_UPDATED");

    revalidateDashboard(clientServiceId);
  });
}

// Déconnecte l'agenda de la solution, quel que soit l'outil.
export async function disconnectCalendar(clientServiceId: string) {
  return runAction(async () => {
    const [userId, clientService] = await Promise.all([
      requireUserId(),
      db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
    ]);
    await requireMemberOn(clientService, userId);

    const [google, scheduling] = await db.$transaction([
      db.calendarConnection.deleteMany({ where: { clientServiceId } }),
      db.schedulingConnection.deleteMany({ where: { clientServiceId } }),
    ]);
    if (google.count + scheduling.count > 0) {
      await logServiceEvent(clientServiceId, "CALENDAR_DISCONNECTED");
    }
    revalidateDashboard(clientServiceId);
  });
}

async function readSchedulingAccount(provider: string, token: string): Promise<ProviderAccount> {
  if (!isSchedulingProvider(provider)) throw actionError("unknownCalendarTool");
  const trimmed = token.trim();
  if (trimmed.length < 10 || trimmed.length > 2000) {
    throw actionError("pasteFullKey");
  }
  try {
    return provider === "calcom"
      ? await readCalcomAccount(trimmed)
      : await readCalendlyAccount(trimmed);
  } catch (err) {
    if (err instanceof SchedulingError) throw new ActionError(err.message);
    console.error(`[agenda] ${provider} : lecture du compte échouée`, err);
    throw actionError("calendarToolDown", { provider: PROVIDER_LABELS[provider] });
  }
}

// Première étape de la connexion : vérifie la clé et liste les types de
// rendez-vous du compte, sans rien enregistrer.
export async function previewSchedulingAccount(
  clientServiceId: string,
  provider: string,
  token: string
) {
  return runAction(async () => {
    const [userId, clientService] = await Promise.all([
      requireUserId(),
      db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
    ]);
    await requireMemberOn(clientService, userId);
    if (!(await checkRateLimit("scheduling-preview", userId, "10 m", 20))) {
      throw actionError("tooManyTries");
    }

    const account = await readSchedulingAccount(provider, token);
    if (account.eventTypes.length === 0) {
      throw actionError("noEventType");
    }
    return account;
  });
}

// Deuxième étape : relit le compte côté serveur (la clé et le type de
// rendez-vous ne sont jamais crus sur parole), chiffre la clé et remplace
// l'agenda précédent.
export async function connectSchedulingTool(
  clientServiceId: string,
  provider: string,
  token: string,
  eventTypeId: string
) {
  return runAction(async () => {
    const [userId, clientService] = await Promise.all([
      requireUserId(),
      db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
    ]);
    await requireMemberOn(clientService, userId);
    if (!(await checkRateLimit("scheduling-connect", userId, "10 m", 10))) {
      throw actionError("tooManyTries");
    }

    const account = await readSchedulingAccount(provider, token);
    const eventType = account.eventTypes.find((option) => option.id === eventTypeId);
    if (!eventType) throw actionError("chooseEventType");

    const data = {
      provider,
      encryptedToken: sealSecret(token.trim()),
      accountLabel: account.accountLabel,
      eventTypeId: eventType.id,
      eventTypeName: eventType.name,
      durationMinutes: eventType.durationMinutes,
      location: eventType.location ?? Prisma.DbNull,
    };
    await db.$transaction([
      db.calendarConnection.deleteMany({ where: { clientServiceId } }),
      db.schedulingConnection.upsert({
        where: { clientServiceId },
        create: { clientServiceId, ...data },
        update: data,
      }),
    ]);
    await logServiceEvent(
      clientServiceId,
      "CALENDAR_CONNECTED",
      `${PROVIDER_LABELS[provider as SchedulingProvider]} : ${eventType.name} (${account.accountLabel})`
    );
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
    await requireBillingRoleOn(clientService, userId);

    const accessToken = await exchangeMetaEmbeddedSignupCode(code);
    if (!(await whatsAppNumberBelongsToToken(wabaId, phoneNumberId, accessToken))) {
      throw actionError("whatsappAccountMismatch");
    }
    const alreadyUsed = await db.clientService.findFirst({
      where: { whatsappPhoneNumberId: phoneNumberId, id: { not: clientServiceId } },
      select: { id: true },
    });
    if (alreadyUsed) throw actionError("whatsappNumberInUse");

    await subscribeAppToWaba(wabaId, accessToken);
    await registerPhoneNumber(phoneNumberId, accessToken);
    const displayNumber = await fetchDisplayPhoneNumber(phoneNumberId, accessToken);

    await db.clientService
      .update({
        where: { id: clientServiceId },
        data: {
          whatsappPhoneNumberId: phoneNumberId,
          whatsappBusinessAccountId: wabaId,
          whatsappAccessToken: accessToken,
          whatsappDisplayNumber: displayNumber,
        },
      })
      .catch((err) => {
        throw isUniqueViolation(err) ? actionError("whatsappNumberInUse") : err;
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
    await requireBillingRoleOn(clientService, userId);

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
    await requireBillingRoleOn(clientService, userId);

    // La Page est lue dans /me/accounts du jeton obtenu auprès de Meta : elle
    // ne vient jamais du navigateur, son appartenance est donc garantie.
    const userAccessToken = await exchangeMetaEmbeddedSignupCode(code);
    const page = await fetchManagedPage(userAccessToken);
    if (!page) {
      throw actionError("noFacebookPage");
    }
    const alreadyUsed = await db.clientService.findFirst({
      where: { facebookPageId: page.id, id: { not: clientServiceId } },
      select: { id: true },
    });
    if (alreadyUsed) throw actionError("facebookPageInUse");
    await subscribePageToApp(page.id, page.access_token);

    await db.clientService
      .update({
        where: { id: clientServiceId },
        data: {
          facebookPageId: page.id,
          facebookPageAccessToken: page.access_token,
          facebookPageName: page.name,
        },
      })
      .catch((err) => {
        throw isUniqueViolation(err) ? actionError("facebookPageInUse") : err;
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
    await requireBillingRoleOn(clientService, userId);

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
    await requireBillingRoleOn(clientService, userId);

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
    throw actionError("noPhoneForService");
  }
  if (clientService.status !== "CONFIGURING" && clientService.status !== "ACTIVE") {
    throw actionError("payBeforeNumber");
  }
  if (clientService.externalPhoneNumber) {
    throw actionError("numberAlreadyAssigned");
  }
  return clientService;
}

const PHONE_SEARCHES_PER_HOUR_PER_USER = 30;
const PHONE_PURCHASES_PER_DAY_PER_ORGANIZATION = 3;
const PHONE_PURCHASE_ATTEMPTS_PER_HOUR_PER_ORGANIZATION = 10;
const MAX_PHONE_NUMBERS_PER_ORGANIZATION = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function searchPhoneNumbers(clientServiceId: string) {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnedTelephonyService(clientServiceId, userId);
    if (!(await checkRateLimit("phone-search", userId, "1 h", PHONE_SEARCHES_PER_HOUR_PER_USER))) {
      throw actionError("tooManyNumberSearches");
    }
    return searchAvailableNumbers();
  });
}

export async function purchasePhoneNumberForService(
  clientServiceId: string,
  phoneNumber: string
) {
  return runAction(async () => {
    const userId = await requireUserId();
    if (!isFrenchE164(phoneNumber)) throw actionError("frenchNumberOnly");
    const clientService = await requireOwnedTelephonyService(clientServiceId, userId);
    const { organizationId } = clientService;

    // Un numéro par solution (externalPhoneNumber), et un plafond global par
    // organisation : chaque numéro est facturé tous les mois par Twilio.
    const numbersInOrganization = await db.clientService.count({
      where: { organizationId, externalPhoneNumber: { not: null } },
    });
    if (numbersInOrganization >= MAX_PHONE_NUMBERS_PER_ORGANIZATION) {
      throw actionError("phoneNumberCapReached", { max: MAX_PHONE_NUMBERS_PER_ORGANIZATION });
    }
    // Le quota quotidien compte les achats réussis (événements PHONE_ASSIGNED
    // des dernières 24 h), pas les tentatives : un numéro parti entre-temps ou
    // une erreur Twilio ne doit pas bloquer l'organisation pour la journée.
    const purchasesToday = await db.serviceEvent.count({
      where: {
        type: "PHONE_ASSIGNED",
        createdAt: { gte: new Date(Date.now() - DAY_MS) },
        clientService: { organizationId },
      },
    });
    if (purchasesToday >= PHONE_PURCHASES_PER_DAY_PER_ORGANIZATION) {
      throw actionError("tooManyNumberPurchases");
    }
    // Garde-fou contre le martèlement de l'API Twilio, large pour laisser
    // plusieurs essais après des numéros devenus indisponibles.
    if (
      !(await checkRateLimit(
        "phone-purchase-attempt",
        organizationId,
        "1 h",
        PHONE_PURCHASE_ATTEMPTS_PER_HOUR_PER_ORGANIZATION
      ))
    ) {
      throw actionError("tooManyNumberPurchases");
    }

    let purchased: Awaited<ReturnType<typeof purchasePhoneNumber>>;
    try {
      purchased = await purchasePhoneNumber(phoneNumber);
    } catch (err) {
      if (err instanceof PhoneNumberUnavailableError) throw actionError("numberNoLongerAvailable");
      throw err;
    }

    const { count } = await db.clientService.updateMany({
      where: { id: clientServiceId, externalPhoneNumber: null },
      data: {
        externalPhoneNumber: purchased.phoneNumber,
        externalPhoneNumberSid: purchased.sid,
      },
    });
    if (count === 0) {
      await releasePhoneNumber(purchased.sid);
      throw actionError("numberAssignedMeanwhile");
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
        // Libère le numéro WhatsApp, la page ou le compte Instagram : ils
        // pourront être reliés à une nouvelle solution (identifiants uniques).
        ...CLEARED_META_CONNECTION,
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

export async function openBillingPortal(organizationId: string) {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireBillingRoleOn({ organizationId }, userId);

    const customerId = await organizationCustomerId(organizationId);
    if (!customerId) {
      throw actionError("noPaymentMethod");
    }
    const url = await createBillingPortalUrl(customerId, `${appUrl()}/dashboard/payments`);
    return { url };
  });
}

// Le client accepte ou refuse que l'assistant continue au-delà de son forfait.
// Refusé, l'assistant se met en pause une fois le forfait atteint.
export async function setOverageAllowed(clientServiceId: string, allowed: boolean) {
  return runAction(async () => {
    const userId = await requireUserId();
    if (!(await checkRateLimit("overage-change", userId, "10 m", 10))) {
      throw actionError("tooManyAttempts");
    }

    const clientService = await db.clientService.findUnique({
      where: { id: clientServiceId },
      include: { service: true },
    });
    if (!clientService) throw actionError("notYourService");
    await requireBillingRoleOn(clientService, userId);
    // Même conditions que l'interrupteur : une solution en service, avec un
    // forfait dont le dépassement a un prix.
    if (clientService.status !== "ACTIVE" && clientService.status !== "CONFIGURING") {
      throw actionError("overageOnlyActive");
    }
    const cap = readClientUsageCap(clientService, clientService.service);
    if (!cap || cap.overageUnitPriceCents <= 0) throw actionError("overageNotAvailable");
    if (clientService.overageAllowed === allowed) return;

    await db.clientService.update({
      where: { id: clientServiceId },
      data: { overageAllowed: allowed },
    });
    await logServiceEvent(clientServiceId, allowed ? "OVERAGE_ACCEPTED" : "OVERAGE_REFUSED");

    revalidateDashboard(clientServiceId);
    revalidatePath("/dashboard/subscriptions");
  });
}

export async function changeSubscriptionQuota(
  clientServiceId: string,
  units: number
) {
  return runAction(async () => {
    const userId = await requireUserId();
    if (!(await checkRateLimit("quota-change", userId, "10 m", 10))) {
      throw actionError("tooManyAttempts");
    }

    const clientService = await db.clientService.findUniqueOrThrow({
      where: { id: clientServiceId },
      include: { service: true },
    });
    await requireBillingRoleOn(clientService, userId);

    if (clientService.status !== "ACTIVE" && clientService.status !== "CONFIGURING") {
      throw actionError("volumeOnlyActive");
    }
    if (!clientService.stripeSubscriptionId) {
      throw actionError("noSubscription");
    }

    const tier = readSubscriptionTier(clientService.service);
    if (!tier) {
      throw actionError("volumeNotAdjustable");
    }
    if (!isValidUnitSelection(tier, units)) {
      throw actionError("volumeNotOffered");
    }

    const current = clientService.includedUsageUnits ?? tier.minUnits;
    if (units === current) return { immediateChargeCents: 0 };

    const monthlyPriceCents = calculateMonthlyPriceCents(tier, units);
    const { immediateChargeCents } = await applyMonthlyPriceChange(
      clientService.stripeSubscriptionId,
      monthlyPriceCents
    );

    await db.clientService.update({
      where: { id: clientServiceId },
      data: { includedUsageUnits: units, monthlyPriceCents },
    });
    await logServiceEvent(
      clientServiceId,
      "QUOTA_CHANGED",
      `${current} → ${units}`
    );

    revalidateDashboard(clientServiceId);
    revalidatePath("/dashboard/subscriptions");
    return { immediateChargeCents };
  });
}
