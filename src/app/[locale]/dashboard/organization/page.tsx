import { titleMetadata } from "@/i18n/metadata";
import { UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { formatDate } from "@/lib/catalog";
import { isOrganizationManager, roleLabel } from "@/lib/organization-roles";
import { TeamMembers } from "./team-members";
import { PendingInvitations } from "./pending-invitations";
import { InviteForm } from "./invite-form";
import { OrganizationPicker } from "./organization-picker";

export const generateMetadata = titleMetadata("organization");

export default async function OrganisationPage() {
  const [session, { active: organization, organizations }, t] = await Promise.all([
    requireUser(),
    requireActiveOrganization(),
    getTranslations("Dashboard.organization"),
  ]);

  const [members, invitations] = await Promise.all([
    db.member.findMany({
      where: { organizationId: organization.id },
      select: {
        id: true,
        role: true,
        createdAt: true,
        userId: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.invitation.findMany({
      where: { organizationId: organization.id, status: "pending" },
      select: { id: true, email: true, role: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const me = members.find((m) => m.userId === session.user.id);
  const canManage = me ? isOrganizationManager(me.role) : false;
  const isAlone = members.length === 1 && invitations.length === 0;

  const myRoles = me?.role.split(",").map((part) => part.trim()) ?? [];
  const myRole = ["owner", "admin", "member"].find((role) => myRoles.includes(role));

  return (
    <PageShell size="content">
      <PageHeader
        title={t("title")}
        description={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <OrganizationPicker active={organization} organizations={organizations} />
              {myRole && <Badge variant="secondary">{t("you", { role: roleLabel(myRole) })}</Badge>}
            </div>
            <p className="mt-2">{t("description")}</p>
          </>
        }
        actions={
          canManage && (
            <Button variant="outline" nativeButton={false} render={<a href="#invite" />}>
              <UserPlus aria-hidden="true" data-icon="inline-start" />
              {t("invite")}
            </Button>
          )
        }
      />

      <div className="space-y-10">
        <section aria-labelledby="team" className="space-y-3">
          <SectionTitle id="team" count={members.length}>
            {t("team")}
          </SectionTitle>

          {isAlone ? (
            <EmptyState
              icon={UserPlus}
              title={t("alone.title")}
              description={canManage ? t("alone.manager") : t("alone.member")}
            />
          ) : (
            <Card>
              <CardContent>
                <TeamMembers
                  organizationId={organization.id}
                  canManage={canManage}
                  canTransfer={myRole === "owner"}
                  members={members.map((m) => ({
                    id: m.id,
                    role: m.role,
                    name: m.user.name,
                    email: m.user.email,
                    joinedAt: formatDate(m.createdAt),
                    isMe: m.userId === session.user.id,
                  }))}
                />
              </CardContent>
            </Card>
          )}
        </section>

        {invitations.length > 0 && (
          <section aria-labelledby="invitations" className="space-y-3">
            <SectionTitle id="invitations" count={invitations.length}>
              {t("pending")}
            </SectionTitle>
            <Card>
              <CardContent>
                <PendingInvitations
                  organizationId={organization.id}
                  canManage={canManage}
                  invitations={invitations.map((invitation) => ({
                    id: invitation.id,
                    email: invitation.email,
                    role: invitation.role ?? "member",
                    expiresAt: formatDate(invitation.expiresAt),
                  }))}
                />
              </CardContent>
            </Card>
          </section>
        )}

        {canManage && (
          <section id="invite" aria-labelledby="invite-title" className="scroll-mt-20 space-y-3">
            <SectionTitle id="invite-title">{t("invite")}</SectionTitle>
            <Card>
              <CardContent>
                <InviteForm organizationId={organization.id} />
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </PageShell>
  );
}

function SectionTitle({
  id,
  count,
  children,
}: {
  id: string;
  count?: number;
  children: React.ReactNode;
}) {
  const t = useTranslations("Dashboard.organization");
  return (
    <h2 id={id} className="flex items-center gap-2 text-lg font-semibold text-foreground">
      {children}
      {count !== undefined && (
        <span className="text-sm font-normal tabular-nums text-muted-foreground">
          {t("count", { count })}
        </span>
      )}
    </h2>
  );
}
