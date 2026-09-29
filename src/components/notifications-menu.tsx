"use client";

import { Link } from "@/i18n/navigation";
import { useTransition } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { NotificationDTO } from "@/lib/notifications";
import { markNotificationsSeen } from "@/app/[locale]/notification-actions";

function formatWhen(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function NotificationsMenu({
  notifications,
}: {
  notifications: NotificationDTO[];
}) {
  const [, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => n.unread).length;

  function handleOpenChange(open: boolean) {
    if (open && unreadCount > 0) {
      startTransition(() => {
        markNotificationsSeen();
      });
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                : "Notifications"
            }
          >
            <Bell aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-lg bg-primary px-1 text-[10px] font-medium text-primary-foreground"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Rien de neuf. Les changements sur vos solutions et les réponses de
            l&apos;équipe apparaîtront ici.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="items-start gap-2"
                render={<Link href={notification.href} />}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    notification.unread ? "bg-primary" : "bg-transparent"
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        notification.unread
                          ? "font-medium text-foreground"
                          : "text-foreground"
                      )}
                    >
                      {notification.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatWhen(notification.createdAt)}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {notification.description}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
