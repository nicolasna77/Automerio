import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import type { Configuration } from "@/lib/catalog";
import { LIVE_STATUSES } from "@/lib/catalog";
import { parisDayKey, parisDayRange } from "@/lib/paris-day";
import { formatFrenchPhone } from "@/lib/phone-format";
import { sendSms, smsRecipient } from "@/lib/sms";

// SMS à l'appelant après une réservation prise au téléphone (confirmation),
// puis la veille d'un rendez-vous (rappel). Réglage par solution :
// `customerSms` = "off" coupe les deux ; absent, les SMS partent.

const TIME_ZONE = "Europe/Paris";

export function customerSmsEnabled(configuration: Configuration): boolean {
  return configuration.customerSms !== "off";
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(date);
}

async function smsTranslator() {
  return getTranslations({ locale: routing.defaultLocale, namespace: "Sms" });
}

type SmsService = {
  configuration: unknown;
  externalPhoneNumber: string | null;
  organization: { name: string };
};

// Le numéro à rappeler est celui de la solution : l'appelant vient de le composer.
function contactPhone(clientService: SmsService): string | null {
  return clientService.externalPhoneNumber ? formatFrenchPhone(clientService.externalPhoneNumber) : null;
}

export async function sendBookingConfirmationSms(input: {
  clientServiceId: string;
  kind: "appointment" | "order" | "quote";
  customerPhone: string;
  startAt?: Date | null;
  workType?: string;
}): Promise<boolean> {
  if (!smsRecipient(input.customerPhone)) return false;
  const clientService = await db.clientService.findUnique({
    where: { id: input.clientServiceId },
    select: { configuration: true, externalPhoneNumber: true, organization: { select: { name: true } } },
  });
  if (!clientService || !customerSmsEnabled((clientService.configuration ?? {}) as Configuration)) return false;
  const phone = contactPhone(clientService);
  if (!phone) return false;

  const t = await smsTranslator();
  const company = clientService.organization.name;
  const body =
    input.kind === "appointment" && input.startAt
      ? t("appointmentConfirmed", { company, date: formatDate(input.startAt), time: formatTime(input.startAt), phone })
      : input.kind === "quote"
        ? t("quoteReceived", { company, work: input.workType ?? "", phone })
        : t("orderConfirmed", { company, phone });
  return sendSms(input.customerPhone, body);
}

// Rendez-vous annulé ou déplacé au téléphone : l'appelant reçoit la trace
// écrite de ce qui vient d'être fait.
export async function sendAppointmentChangeSms(input: {
  clientServiceId: string;
  change: "canceled" | "moved";
  customerPhone: string;
  startAt: Date;
}): Promise<boolean> {
  if (!smsRecipient(input.customerPhone)) return false;
  const clientService = await db.clientService.findUnique({
    where: { id: input.clientServiceId },
    select: { configuration: true, externalPhoneNumber: true, organization: { select: { name: true } } },
  });
  if (!clientService || !customerSmsEnabled((clientService.configuration ?? {}) as Configuration)) return false;
  const phone = contactPhone(clientService);
  if (!phone) return false;

  const t = await smsTranslator();
  const values = {
    company: clientService.organization.name,
    date: formatDate(input.startAt),
    time: formatTime(input.startAt),
    phone,
  };
  return sendSms(
    input.customerPhone,
    input.change === "canceled" ? t("appointmentCanceled", values) : t("appointmentMoved", values)
  );
}

// Rendez-vous de demain (heure de Paris) sans rappel envoyé, pour une solution
// en service dont les SMS ne sont pas coupés. Chaque rappel envoyé est daté :
// une tâche rejouée n'envoie pas de doublon.
export async function sendBookingReminders(now: Date = new Date()): Promise<{ sent: number; skipped: number }> {
  const tomorrow = parisDayRange(parisDayKey(new Date(now.getTime() + 24 * 60 * 60 * 1000)));
  if (!tomorrow) return { sent: 0, skipped: 0 };

  const bookings = await db.booking.findMany({
    where: {
      kind: "appointment",
      reminderSentAt: null,
      startAt: { gte: tomorrow.gte, lt: tomorrow.lt },
      clientService: { status: { in: [...LIVE_STATUSES] } },
    },
    select: {
      id: true,
      customerPhone: true,
      startAt: true,
      clientService: {
        select: { configuration: true, externalPhoneNumber: true, organization: { select: { name: true } } },
      },
    },
  });

  const t = await smsTranslator();
  let sent = 0;
  let skipped = 0;
  for (const booking of bookings) {
    const { clientService } = booking;
    const phone = contactPhone(clientService);
    if (
      !booking.startAt ||
      !phone ||
      !customerSmsEnabled((clientService.configuration ?? {}) as Configuration)
    ) {
      skipped += 1;
      continue;
    }
    const delivered = await sendSms(
      booking.customerPhone,
      t("appointmentReminder", { company: clientService.organization.name, time: formatTime(booking.startAt), phone })
    );
    if (!delivered) {
      skipped += 1;
      continue;
    }
    await db.booking.update({ where: { id: booking.id }, data: { reminderSentAt: new Date() } });
    sent += 1;
  }
  return { sent, skipped };
}
