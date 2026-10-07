import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ShieldAlert } from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getAdminNotifications } from "@/lib/notifications";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, openHelpRequestCount] = await Promise.all([
    requireAdmin(),
    db.helpRequest.count({ where: { status: "OPEN" } }),
  ]);
  const viewer = await db.user.findUnique({
    where: { id: session.user.id },
    select: { notificationsSeenAt: true, twoFactorEnabled: true },
  });
  const [notifications, t] = await Promise.all([
    getAdminNotifications(viewer?.notificationsSeenAt ?? null),
    getTranslations("Admin.layout"),
  ]);

  return (
    <WorkspaceLayout
      sidebar={
        <AdminSidebar
          openHelpRequestCount={openHelpRequestCount}
          name={session.user.name}
          email={session.user.email}
        />
      }
      notifications={notifications}
    >
      {!viewer?.twoFactorEnabled && (
        <div className="border-b border-border bg-muted/60 px-4 py-3 sm:px-6">
          <p className="mx-auto flex max-w-6xl items-start gap-2 text-sm text-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              {t.rich("twoFactorWarning", {
                link: (chunks) => (
                  <Link
                    href="/dashboard/profile#two-factor"
                    className="font-medium underline underline-offset-4"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </p>
        </div>
      )}
      {children}
    </WorkspaceLayout>
  );
}
