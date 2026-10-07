// Validation des arguments que le modèle transmet aux outils de l'agent.
// Ces arguments viennent d'un modèle qu'un appelant ou un expéditeur WhatsApp
// peut manipuler (injection de consignes) : rien n'est écrit en base ni dans
// l'agenda sans être borné ici. Une erreur est renvoyée au modèle sous forme
// de phrase courte, jamais levée.

export const LIMITS = {
  name: 100,
  phone: 30,
  email: 254,
  address: 300,
  notes: 1000,
  itemName: 100,
  maxItems: 50,
  minQuantity: 1,
  maxQuantity: 99,
  minDurationMinutes: 5,
  maxDurationMinutes: 480,
  // Un rendez-vous ne se prend pas plus d'un an à l'avance.
  bookingHorizonMs: 365 * 24 * 60 * 60 * 1000,
} as const;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

// Chaîne nettoyée et tronquée ; vide si absente ou d'un autre type.
export function boundedString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function optionalString(value: unknown, max: number): string | null {
  return boundedString(value, max) || null;
}

function contactOf(args: Record<string, unknown>): ValidationResult<{ customerName: string; customerPhone: string }> {
  const customerName = boundedString(args.customerName, LIMITS.name);
  const customerPhone = boundedString(args.customerPhone, LIMITS.phone);
  if (!customerName || !customerPhone) {
    return fail("Il manque le nom ou le numéro de téléphone : demande-les avant de réessayer.");
  }
  return { ok: true, value: { customerName, customerPhone } };
}

export function validateSlot(
  args: Record<string, unknown>,
  now: Date = new Date()
): ValidationResult<{ startAt: Date; durationMinutes: number }> {
  const startAt = typeof args.startAt === "string" ? new Date(args.startAt) : new Date(NaN);
  if (!Number.isFinite(startAt.getTime())) {
    return fail("Date du créneau invalide : redemande le jour et l'heure, au format ISO 8601.");
  }
  if (startAt.getTime() <= now.getTime()) {
    return fail("Ce créneau est déjà passé : propose un horaire à venir.");
  }
  if (startAt.getTime() > now.getTime() + LIMITS.bookingHorizonMs) {
    return fail("Ce créneau est trop lointain : propose un horaire dans les douze prochains mois.");
  }
  const durationMinutes = Number(args.durationMinutes);
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < LIMITS.minDurationMinutes ||
    durationMinutes > LIMITS.maxDurationMinutes
  ) {
    return fail(
      `Durée invalide : indique un nombre entier de minutes entre ${LIMITS.minDurationMinutes} et ${LIMITS.maxDurationMinutes}.`
    );
  }
  return { ok: true, value: { startAt, durationMinutes } };
}

export type BookingArgs = {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  startAt: Date;
  durationMinutes: number;
  notes: string | null;
};

// fixedDurationMinutes : durée imposée par l'agenda, qui prime sur celle du
// modèle ; celle du modèle n'est alors pas exigée.
export function validateBooking(
  args: Record<string, unknown>,
  fixedDurationMinutes: number | null,
  now: Date = new Date()
): ValidationResult<BookingArgs> {
  const contact = contactOf(args);
  if (!contact.ok) return contact;
  const slot = validateSlot(
    fixedDurationMinutes ? { ...args, durationMinutes: fixedDurationMinutes } : args,
    now
  );
  if (!slot.ok) return slot;
  const email = boundedString(args.customerEmail, LIMITS.email);
  return {
    ok: true,
    value: {
      ...contact.value,
      customerEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
      startAt: slot.value.startAt,
      durationMinutes: slot.value.durationMinutes,
      notes: optionalString(args.notes, LIMITS.notes),
    },
  };
}

export type OrderItem = { name: string; quantity: number };

export type OrderArgs = {
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  fulfillment: "pickup" | "delivery";
  address: string | null;
  notes: string | null;
};

export function validateOrder(args: Record<string, unknown>): ValidationResult<OrderArgs> {
  const contact = contactOf(args);
  if (!contact.ok) return contact;
  if (!Array.isArray(args.items) || args.items.length === 0) {
    return fail("La commande ne contient aucun article : note les articles avant de l'enregistrer.");
  }
  if (args.items.length > LIMITS.maxItems) {
    return fail(`Trop d'articles : une commande en compte ${LIMITS.maxItems} au plus.`);
  }
  const items: OrderItem[] = [];
  for (const raw of args.items) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const name = boundedString(item.name, LIMITS.itemName);
    const quantity = Number(item.quantity);
    if (!name) return fail("Un article n'a pas de nom : relis la commande avec l'appelant.");
    if (!Number.isInteger(quantity) || quantity < LIMITS.minQuantity || quantity > LIMITS.maxQuantity) {
      return fail(
        `Quantité invalide pour « ${name} » : indique un nombre entier entre ${LIMITS.minQuantity} et ${LIMITS.maxQuantity}.`
      );
    }
    items.push({ name, quantity });
  }
  const fulfillment = args.fulfillment === "delivery" ? "delivery" : "pickup";
  const address = optionalString(args.address, LIMITS.address);
  if (fulfillment === "delivery" && !address) {
    return fail("Il manque l'adresse de livraison : demande-la avant de réessayer.");
  }
  return {
    ok: true,
    value: {
      ...contact.value,
      items,
      fulfillment,
      address,
      notes: optionalString(args.notes, LIMITS.notes),
    },
  };
}

export function validateMessage(
  args: Record<string, unknown>
): ValidationResult<{ customerName: string; customerPhone: string; reason: string | null }> {
  const contact = contactOf(args);
  if (!contact.ok) return contact;
  return { ok: true, value: { ...contact.value, reason: optionalString(args.reason, LIMITS.notes) } };
}
