import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { BreadcrumbProvider, HeaderBreadcrumbs } from "@/components/header-breadcrumbs";
import { NotificationsMenu } from "@/components/notifications-menu";
import type { NotificationDTO } from "@/lib/notifications";

const SIDEBAR_COOKIE_NAME = "sidebar_state";

export async function WorkspaceLayout({
  sidebar,
  notifications,
  breadcrumbRoot,
  breadcrumbPages,
  children,
}: {
  sidebar: React.ReactNode;
  notifications: NotificationDTO[];
  // Fil d'Ariane de la barre du haut : la racine de l'espace, puis les pages
  // connues par chemin (voir HeaderBreadcrumbs).
  breadcrumbRoot: { label: string; href: string };
  breadcrumbPages: Record<string, string>;
  children: React.ReactNode;
}) {
  const [cookieStore, t] = await Promise.all([cookies(), getTranslations("Workspace")]);
  const defaultOpen = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== "false";

  return (
    <div className="bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-2xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        {t("skipToContent")}
      </a>
      <TooltipProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          {sidebar}
          <SidebarInset>
            <BreadcrumbProvider>
            <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <Separator orientation="vertical" className="mr-1 h-4 w-px self-center" />
                <HeaderBreadcrumbs root={breadcrumbRoot} pages={breadcrumbPages} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <NotificationsMenu notifications={notifications} />
                <ThemeToggle />
              </div>
            </header>
            <main id="main-content" className="flex-1">
              {children}
            </main>
            </BreadcrumbProvider>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </div>
  );
}
