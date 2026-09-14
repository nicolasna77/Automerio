import { db } from "@/lib/db";
import { SERVICE_EVENT_LABELS, type ServiceEventType } from "@/lib/catalog";

export type NotificationDTO = {
  id: string;
  title: string;
  description: string;
  href: string;
  createdAt: Date;
  unread: boolean;
};

const MAX_NOTIFICATIONS = 20;
const WINDOW_DAYS = 30;

function windowStart(): Date {
  return new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

function sortAndCap(
  items: Omit<NotificationDTO, "unread">[],
  seenAt: Date | null
): NotificationDTO[] {
  return items
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, MAX_NOTIFICATIONS)
    .map((item) => ({
      ...item,
      unread: seenAt === null || item.createdAt > seenAt,
    }));
}

export async function getClientNotifications(
  organizationId: string,
  seenAt: Date | null
): Promise<NotificationDTO[]> {
  const since = windowStart();

  const [events, replies] = await Promise.all([
    db.serviceEvent.findMany({
      where: {
        createdAt: { gte: since },
        clientService: { organizationId },
      },
      include: { clientService: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
    }),
    db.helpRequestMessage.findMany({
      where: {
        createdAt: { gte: since },
        fromTeam: true,
        helpRequest: { organizationId },
      },
      include: { helpRequest: { select: { subject: true } } },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
    }),
  ]);

  return sortAndCap(
    [
      ...events.map((event) => ({
        id: `event-${event.id}`,
        title: SERVICE_EVENT_LABELS[event.type as ServiceEventType],
        description: event.clientService.name,
        href: `/dashboard/services/${event.clientService.id}`,
        createdAt: event.createdAt,
      })),
      ...replies.map((reply) => ({
        id: `reply-${reply.id}`,
        title: "Réponse de l'équipe Automerio",
        description: reply.helpRequest.subject,
        href: "/dashboard/aide",
        createdAt: reply.createdAt,
      })),
    ],
    seenAt
  );
}

export async function getAdminNotifications(
  seenAt: Date | null
): Promise<NotificationDTO[]> {
  const since = windowStart();

  const [requests, replies] = await Promise.all([
    db.helpRequest.findMany({
      where: { createdAt: { gte: since } },
      include: {
        user: { select: { name: true } },
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
    }),
    db.helpRequestMessage.findMany({
      where: { createdAt: { gte: since }, fromTeam: false },
      include: {
        author: { select: { name: true } },
        helpRequest: { select: { subject: true } },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
    }),
  ]);

  return sortAndCap(
    [
      ...requests.map((request) => ({
        id: `request-${request.id}`,
        title: "Nouvelle demande d'aide",
        description: `${request.user.name} — ${request.subject}`,
        href: "/admin/aide",
        createdAt: request.createdAt,
      })),
      ...replies.map((reply) => ({
        id: `client-reply-${reply.id}`,
        title: "Réponse d'un client",
        description: `${reply.author.name} — ${reply.helpRequest.subject}`,
        href: "/admin/aide",
        createdAt: reply.createdAt,
      })),
    ],
    seenAt
  );
}
