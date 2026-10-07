import type { Messages } from "next-intl";
import {
  countCatalogItems,
  type CatalogSection,
} from "@/lib/product-catalog";
import {
  setupAction,
  type ClientServiceStatus,
  type ServiceEventType,
  type WeekDay,
} from "@/lib/catalog";
import type { NotificationType } from "@/lib/email/types";
import type { HelpRequestStatus } from "@prisma/client";
import { parisDayKey } from "@/lib/paris-day";
import { previousDayKey } from "@/lib/day-label";

// Libellés métier traduits (espace « Labels » de messages/*.json), partagés
// par les composants serveur et client comme createPriceFormatter.
export type LabelTranslator = (key: string, values?: Record<string, string | number>) => string;

export type Labels = ReturnType<typeof createLabels>;

type LabelKey = keyof Messages["Labels"];

const ROLES = ["owner", "admin", "member"] as const;

export function createLabels(translate: LabelTranslator, locale: string) {
  const t = (key: `${LabelKey}${string}`, values?: Record<string, string | number>) => translate(key, values);
  const longDate = (date: Date) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(date);
  const shortDate = (date: Date) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(date);
  const isRole = (role: string): role is (typeof ROLES)[number] => (ROLES as readonly string[]).includes(role);

  const dayLabel = (key: string) => {
    const today = parisDayKey(new Date());
    if (key === today) return t("day.today");
    if (key === previousDayKey(today)) return t("day.yesterday");
    const [year, month, day] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  };

  return {
    status: (status: ClientServiceStatus) => t(`status.${status}`),
    pausedStatus: () => t("pausedStatus"),
    serviceEvent: (type: ServiceEventType) => t(`serviceEvent.${type}`),
    weekDay: (day: WeekDay) => t(`weekDay.${day}`),
    role: (role: string) => (isRole(role) ? t(`role.${role}`) : role),
    roleDescription: (role: string) => (isRole(role) ? t(`roleDescription.${role}`) : null),
    helpStatus: (status: HelpRequestStatus) => t(`helpStatus.${status}`),
    notification: (type: NotificationType) => t(`notification.${type}.label`),
    notificationDescription: (type: NotificationType) => t(`notification.${type}.description`),

    serviceStatus(item: {
      status: ClientServiceStatus;
      createdAt: Date;
      activatedAt: Date | null;
      canceledAt: Date | null;
    }): string {
      switch (item.status) {
        case "ACTIVE":
          return item.activatedAt
            ? t("serviceStatus.activeSince", { date: longDate(item.activatedAt) })
            : t("serviceStatus.active");
        case "PENDING_PAYMENT":
          return t("serviceStatus.pendingSince", { date: longDate(item.createdAt) });
        case "CONFIGURING":
          return t("serviceStatus.configuring");
        case "CANCELED":
          return item.canceledAt
            ? t("serviceStatus.canceledOn", { date: longDate(item.canceledAt) })
            : t("serviceStatus.canceled");
      }
    },

    setupAction(item: Parameters<typeof setupAction>[0]): { hint: string; cta: string } | null {
      const action = setupAction(item);
      return action ? { hint: t(`setup.${action.id}.hint`), cta: t(`setup.${action.id}.cta`) } : null;
    },

    period({ start, end }: { start: Date; end: Date | null }): string {
      return end
        ? t("period.range", { start: shortDate(start), end: shortDate(end) })
        : t("period.since", { start: shortDate(start) });
    },

    nextCharge(
      subscription: {
        status: ClientServiceStatus;
        canceledAt: Date | null;
        renews: boolean;
        period: { end: Date | null };
      },
      amount: string
    ): string {
      const end = subscription.period.end;
      if (subscription.status === "CANCELED") {
        return subscription.canceledAt
          ? t("nextCharge.canceledOn", { date: longDate(subscription.canceledAt) })
          : t("nextCharge.canceled");
      }
      if (subscription.status === "PENDING_PAYMENT") return t("nextCharge.pending");
      if (!subscription.renews) {
        return end ? t("nextCharge.notRenewedAfter", { date: longDate(end) }) : t("nextCharge.notRenewed");
      }
      return end ? t("nextCharge.nextOn", { amount, date: longDate(end) }) : t("nextCharge.next", { amount });
    },

    dayLabel,
    dayPhrase(key: string): string {
      const today = parisDayKey(new Date());
      if (key === today) return t("day.todayPhrase");
      if (key === previousDayKey(today)) return t("day.yesterdayPhrase");
      return t("day.on", { day: dayLabel(key) });
    },

    productCatalog(sections: CatalogSection[]): string {
      const count = countCatalogItems(sections);
      if (count === 0) return t("catalog.none");
      const titled = sections.filter((section) => section.title).length;
      return titled > 1 ? t("catalog.inSections", { count, sections: titled }) : t("catalog.products", { count });
    },
  };
}
