import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import { formatFrenchPhone } from "@/lib/phone-format";
import { sendSms } from "@/lib/sms";

// Alerte SMS à l'artisan quand le résumé d'un appel le dit urgent : sur un
// chantier, on lit un SMS, pas ses e-mails. Destinataire : le mobile du
// réglage « Mobile pour les alertes urgentes » (`alertPhone`) ; sans lui,
// rien ne part (le résumé reste dans le tableau de bord et l'e-mail).
export async function sendUrgentCallAlert(input: {
  clientServiceId: string;
  usageEventId: string;
  reason: string | null;
  callerName: string | null;
}): Promise<boolean> {
  const [clientService, usageEvent] = await Promise.all([
    db.clientService.findUnique({ where: { id: input.clientServiceId }, select: { name: true, configuration: true } }),
    db.usageEvent.findUnique({ where: { id: input.usageEventId }, select: { metadata: true } }),
  ]);
  const configuration = (clientService?.configuration ?? {}) as Record<string, unknown>;
  const alertPhone = typeof configuration.alertPhone === "string" ? configuration.alertPhone : null;
  if (!clientService || !alertPhone) return false;

  const metadata = (usageEvent?.metadata ?? {}) as Record<string, unknown>;
  const fromNumber = typeof metadata.fromNumber === "string" ? metadata.fromNumber : null;

  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Sms" });
  return sendSms(
    alertPhone,
    t("urgentCall", {
      service: clientService.name,
      caller: input.callerName ?? t("unknownCaller"),
      number: fromNumber ? formatFrenchPhone(fromNumber) : t("hiddenNumber"),
      reason: input.reason ?? "",
    }).trim()
  );
}
