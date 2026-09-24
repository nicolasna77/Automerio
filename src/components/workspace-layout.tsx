import { cookies } from "next/headers";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsMenu } from "@/components/notifications-menu";
import type { NotificationDTO } from "@/lib/notifications";

const SIDEBAR_COOKIE_NAME = "sidebar_state";

export async function WorkspaceLayout({
  sidebar,
  notifications,
  children,
}: {
  sidebar: React.ReactNode;
  notifications: NotificationDTO[];
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== "false";

  return (
    <div className="bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-2xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Aller au contenu
      </a>
      <TooltipProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          {sidebar}
          <SidebarInset>
            <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <NotificationsMenu notifications={notifications} />
                <ThemeToggle />
              </div>
            </header>
            <main id="main-content" className="flex-1">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </div>
  );
}
