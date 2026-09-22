import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
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
  // Le serveur reste seul juge : l'interface cesse seulement de proposer ce qui
  // serait refuse, et chaque action revalide de son cote.
  const canManage = me ? isOrganizationManager(me.role) : false;
  const isAlone = members.length === 1 && invitations.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {organization.name}
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Les personnes qui ont accès aux solutions de cette entreprise. Un
          collaborateur consulte et configure ; un responsable peut en plus
          résilier, payer et gérer l&apos;équipe.
        </p>
      </div>

      <section aria-labelledby="equipe" className="space-y-3">
        <h2 id="equipe" className="text-lg font-semibold text-foreground">
          Équipe
        </h2>

        {isAlone ? (
          <EmptyState
            icon={UserPlus}
            title="Vous êtes seul sur cette entreprise"
            description={
              canManage
                ? "Invitez un collègue pour qu'il suive les appels reçus et la configuration des solutions, sans lui donner la main sur les paiements."
                : "Un responsable peut inviter d'autres personnes à rejoindre cette entreprise."
            }
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <TeamMembers
                organizationId={organization.id}
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
        )}
      </section>

      {invitations.length > 0 && (
        <section aria-labelledby="invitations" className="space-y-3">
          <h2 id="invitations" className="text-lg font-semibold text-foreground">
            Invitations en attente
          </h2>
          <Card>
            <CardContent className="pt-6">
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
        <section aria-labelledby="inviter" className="space-y-3">
          <h2 id="inviter" className="text-lg font-semibold text-foreground">
            Inviter quelqu&apos;un
          </h2>
          <Card>
            <CardContent className="pt-6">
              <InviteForm organizationId={organization.id} />
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
