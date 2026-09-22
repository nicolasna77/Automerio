import type { Metadata } from "next";
import { Building2, MailPlus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { formatDate } from "@/lib/catalog";
import { isOrganizationManager } from "@/lib/organization-roles";
import { TeamMembers } from "./team-members";
import { PendingInvitations } from "./pending-invitations";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Organisation" };

export default async function OrganisationPage() {
  const [session, { active: organization }] = await Promise.all([
    requireUser(),
    requireActiveOrganization(),
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
  // Le serveur reste seul juge : l'interface ne fait que cesser de proposer ce
  // qui serait refuse, les actions revalident chacune de leur cote.
  const canManage = me ? isOrganizationManager(me.role) : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Organisation
        </h1>
        <p className="mt-1 text-muted-foreground">
          Les personnes qui ont accès aux solutions de {organization.name}.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">{organization.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {members.length === 1
              ? "Vous êtes seul sur cette entreprise."
              : `${members.length} personnes ont accès à cette entreprise.`}{" "}
            Un collaborateur consulte et configure les solutions ; un responsable
            peut en plus résilier, payer et gérer l&apos;équipe.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Users className="size-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">Membres</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamMembers
            organizationId={organization.id}
            currentUserId={session.user.id}
            canManage={canManage}
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

      {invitations.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <MailPlus className="size-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">Invitations en attente</CardTitle>
          </CardHeader>
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
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inviter quelqu&apos;un</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteForm organizationId={organization.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
