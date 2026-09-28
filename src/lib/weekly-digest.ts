import { db } from "@/lib/db";
import type { Configuration } from "@/lib/catalog";
import { hoursOf, isOpenAt } from "@/lib/business-hours";
import { sendWeeklyDigestEmail } from "@/lib/email/notifications";

/**
 * Le bilan de la semaine, envoye chaque lundi : ce que les solutions ont fait
 * pour le client. C'est ce qui lui montre que l'abonnement travaille — et ce
 * qui le retient de resilier.
 */

export type WeeklyDigest = {
  calls: number;
  afterHoursCalls: number;
  appointments: number;
  orders: number;
  messagesAnswered: number;
};

export type DigestPeriod = { start: Date; end: Date };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Les sept jours qui precedent `now`. */
export function lastSevenDays(now: Date): DigestPeriod {
  return { start: new Date(now.getTime() - 7 * DAY_MS), end: now };
}

export function isEmptyDigest(digest: WeeklyDigest): boolean {
  return (
    digest.calls === 0 &&
    digest.appointments === 0 &&
    digest.orders === 0 &&
    digest.messagesAnswered === 0
  );
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/** Les lignes du bilan, dans l'ordre ou le client les lira. Rien pour un zero. */
export function digestHighlights(digest: WeeklyDigest): string[] {
  const lines: string[] = [];
  if (digest.calls > 0) {
    const afterHours =
      digest.afterHoursCalls > 0
        ? `, dont ${digest.afterHoursCalls} en dehors de vos horaires`
        : "";
    lines.push(`${plural(digest.calls, "appel pris", "appels pris")}${afterHours}`);
  }
  if (digest.appointments > 0) lines.push(plural(digest.appointments, "rendez-vous pris", "rendez-vous pris"));
  if (digest.orders > 0) lines.push(plural(digest.orders, "commande enregistrée", "commandes enregistrées"));
  if (digest.messagesAnswered > 0) {
    lines.push(plural(digest.messagesAnswered, "message répondu", "messages répondus"));
  }
  return lines;
}

export async function computeWeeklyDigest(organizationId: string, period: DigestPeriod): Promise<WeeklyDigest> {
  const window = { gte: period.start, lt: period.end };
  const [services, calls, appointments, orders, messagesAnswered] = await Promise.all([
    db.clientService.findMany({ where: { organizationId }, select: { id: true, configuration: true } }),
    db.usageEvent.findMany({
      where: { type: "call", status: "completed", occurredAt: window, clientService: { organizationId } },
      select: { clientServiceId: true, occurredAt: true },
    }),
    db.booking.count({ where: { kind: "appointment", createdAt: window, clientService: { organizationId } } }),
    db.booking.count({ where: { kind: "order", createdAt: window, clientService: { organizationId } } }),
    db.conversationMessage.count({
      where: { direction: "OUTBOUND", createdAt: window, conversation: { clientService: { organizationId } } },
    }),
  ]);

  const hoursByService = new Map(
    services.map((service) => [service.id, hoursOf((service.configuration ?? {}) as Configuration)])
  );
  const afterHoursCalls = calls.filter(
    (call) => !isOpenAt(hoursByService.get(call.clientServiceId) ?? null, call.occurredAt)
  ).length;

  return { calls: calls.length, afterHoursCalls, appointments, orders, messagesAnswered };
}

/** Un bilan par semaine : un second passage du cron dans les six jours ne renvoie rien. */
const MIN_INTERVAL_MS = 6 * DAY_MS;

export async function sendWeeklyDigests(now = new Date()): Promise<{ sent: number; empty: number; skipped: number }> {
  const period = lastSevenDays(now);
  const cutoff = new Date(now.getTime() - MIN_INTERVAL_MS);
  const organizations = await db.organization.findMany({
    where: { clientServices: { some: { status: "ACTIVE" } } },
    select: { id: true, name: true, lastWeeklyDigestAt: true },
  });

  const result = { sent: 0, empty: 0, skipped: 0 };
  for (const organization of organizations) {
    // L'entreprise est reservee avant tout calcul : deux executions
    // simultanees du cron ne peuvent pas envoyer deux bilans.
    const { count } = await db.organization.updateMany({
      where: {
        id: organization.id,
        OR: [{ lastWeeklyDigestAt: null }, { lastWeeklyDigestAt: { lt: cutoff } }],
      },
      data: { lastWeeklyDigestAt: now },
    });
    if (count === 0) {
      result.skipped += 1;
      continue;
    }

    try {
      const digest = await computeWeeklyDigest(organization.id, period);
      if (isEmptyDigest(digest)) {
        result.empty += 1;
        continue;
      }
      const members = await db.member.findMany({
        where: { organizationId: organization.id },
        select: { user: { select: { email: true, name: true, notificationPreferences: true } } },
      });
      await Promise.allSettled(
        members.map(({ user }) =>
          sendWeeklyDigestEmail(user, { organizationName: organization.name, highlights: digestHighlights(digest) })
        )
      );
      result.sent += 1;
    } catch (err) {
      console.error(`[bilan] échec pour l'organisation ${organization.id} :`, err);
      // Rendre la reservation : sans quoi une erreur passagere prive
      // l'entreprise de son bilan pour toute la semaine.
      await db.organization
        .updateMany({
          where: { id: organization.id, lastWeeklyDigestAt: now },
          data: { lastWeeklyDigestAt: organization.lastWeeklyDigestAt },
        })
        .catch((resetErr) => console.error(`[bilan] réservation non rendue pour ${organization.id} :`, resetErr));
    }
  }
  return result;
}
