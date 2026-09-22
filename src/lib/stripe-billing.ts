import { stripeClient } from "@/lib/stripe";
import { VAT_PERCENTAGE } from "@/lib/vat";

const VAT_RATE_KEY = `automerio-tva-fr-${VAT_PERCENTAGE}-incluse`;
const PORTAL_CONFIGURATION_KEY = "automerio-portail-client";
const LEGACY_VAT_RATE_KEY = "noveris-tva-fr-20-incluse";
const LEGACY_PORTAL_CONFIGURATION_KEY = "noveris-portail-client";

let vatRatePromise: Promise<string> | null = null;
let portalConfigurationPromise: Promise<string> | null = null;

function memoize(
  current: Promise<string> | null,
  create: () => Promise<string>,
  reset: () => void
): Promise<string> {
  if (current) return current;
  return create().catch((err) => {
    reset();
    throw err;
  });
}

async function findOrCreateVatRate(): Promise<string> {
  const rates = await stripeClient.taxRates.list({ active: true, inclusive: true, limit: 100 });
  // Le pourcentage est verifie en plus de la cle : la cle heritee porte le taux
  // d'alors (20), si bien qu'un changement de VAT_PERCENTAGE lui ferait sinon
  // reutiliser l'ancien taux — l'application afficherait le nouveau et
  // preleverait l'ancien.
  const existing = rates.data.find(
    (rate) =>
      rate.percentage === VAT_PERCENTAGE &&
      (rate.metadata?.key === VAT_RATE_KEY ||
        rate.metadata?.key === LEGACY_VAT_RATE_KEY)
  );
  if (existing) return existing.id;

  const created = await stripeClient.taxRates.create({
    display_name: "TVA",
    description: `TVA française à ${VAT_PERCENTAGE} %, incluse dans le prix`,
    percentage: VAT_PERCENTAGE,
    inclusive: true,
    country: "FR",
    tax_type: "vat",
    metadata: { key: VAT_RATE_KEY },
  });
  return created.id;
}

export function getIncludedVatRateId(): Promise<string> {
  vatRatePromise = memoize(vatRatePromise, findOrCreateVatRate, () => {
    vatRatePromise = null;
  });
  return vatRatePromise;
}

async function findOrCreatePortalConfiguration(): Promise<string> {
  const configurations = await stripeClient.billingPortal.configurations.list({
    active: true,
    limit: 100,
  });
  const existing = configurations.data.find(
    (configuration) =>
      configuration.metadata?.key === PORTAL_CONFIGURATION_KEY ||
      configuration.metadata?.key === LEGACY_PORTAL_CONFIGURATION_KEY
  );
  if (existing) return existing.id;

  const created = await stripeClient.billingPortal.configurations.create({
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["email", "address", "name", "tax_id"] },
      subscription_cancel: { enabled: false },
    },
    metadata: { key: PORTAL_CONFIGURATION_KEY },
  });
  return created.id;
}

function getPortalConfigurationId(): Promise<string> {
  portalConfigurationPromise = memoize(
    portalConfigurationPromise,
    findOrCreatePortalConfiguration,
    () => {
      portalConfigurationPromise = null;
    }
  );
  return portalConfigurationPromise;
}

export async function createBillingPortalUrl(customerId: string, returnUrl: string): Promise<string> {
  const session = await stripeClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
    configuration: await getPortalConfigurationId(),
  });
  return session.url;
}
