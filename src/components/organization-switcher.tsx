"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Plus, Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSwitchOrganization } from "@/hooks/use-switch-organization";
import type { OrganizationSummary } from "@/lib/organization";
import { OrganizationCreateDialog } from "./organization-create-dialog";
import { OrganizationManageDialog } from "./organization-manage-dialog";

function orgInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function OrganizationSwitcher({
  active,
  organizations,
}: {
  active: OrganizationSummary;
  organizations: OrganizationSummary[];
}) {
  const { isMobile } = useSidebar();
  const t = useTranslations("Workspace.organization");
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const { switchTo: handleSwitch, switchingId } = useSwitchOrganization(active.id);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  aria-label={t("switchLabel", { name: active.name })}
                  tooltip={active.name}
                  className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                />
              }
            >
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs font-semibold text-primary"
              >
                {orgInitial(active.name)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col items-start group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium text-sidebar-foreground">
                  {active.name}
                </span>
              </span>
              <ChevronsUpDown
                className="ml-auto size-3.5 shrink-0 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden"
                aria-hidden="true"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side={isMobile ? "bottom" : "right"}
              className="w-64"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("listLabel")}</DropdownMenuLabel>
                {organizations.map((organization) => (
                  <DropdownMenuItem
                    key={organization.id}
                    disabled={switchingId !== null}
                    data-active={organization.id === active.id || undefined}
                    className="data-active:bg-accent data-active:text-accent-foreground"
                    onClick={() => handleSwitch(organization.id)}
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-primary/15 text-xs font-semibold text-primary"
                    >
                      {orgInitial(organization.name)}
                    </span>
                    <span className="truncate">{organization.name}</span>
                    {/* L'entreprise active se lit autrement que par la couleur. */}
                    {organization.id === active.id && (
                      <>
                        <Check className="ml-auto size-4 text-primary" aria-hidden="true" />
                        <span className="sr-only">{t("current")}</span>
                      </>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                  <Plus aria-hidden="true" />
                  {t("create")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setManageOpen(true)}>
                  <Settings2 aria-hidden="true" />
                  {t("manage", { name: active.name })}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <OrganizationCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <OrganizationManageDialog
        organization={active}
        canDelete={organizations.length > 1}
        open={manageOpen}
        onOpenChange={setManageOpen}
      />
    </>
  );
}
