import type { Metadata } from "next";
import Link from "next/link";
import { Building2, UserPlus } from "lucide-react";
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

  // better-auth peut cumuler plusieurs roles : on affiche le plus eleve.
  const myRoles = me?.role.split(",").map((part) => part.trim()) ?? [];
  const myRole = ["owner", "admin", "member"].find((role) => myRoles.includes(role));

  return (
    <PageShell size="content">
      <PageHeader
        title="Organisation"
        description={
          <>
            <p className="flex flex-wrap items-center gap-2 text-foreground">
              <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">{organization.name}</span>
              {myRole && <Badge variant="secondary">Vous : {roleLabel(myRole)}</Badge>}
            </p>
            <p className="mt-2">
              Les personnes qui ont accès aux solutions de cette entreprise. Un
              collaborateur consulte et configure ; un responsable peut en plus
              résilier, payer et gérer l&apos;équipe.
            </p>
          </>
        }
        actions={
          canManage && (
            <Button nativeButton={false} render={<Link href="#inviter" />}>
              <UserPlus aria-hidden="true" data-icon="inline-start" />
              Inviter un membre
            </Button>
          )
        }
      />

      <div className="space-y-10">
        <section aria-labelledby="equipe" className="space-y-3">
          <SectionTitle id="equipe" count={members.length}>
            Équipe
          </SectionTitle>

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
              <CardContent>
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
            <SectionTitle id="invitations" count={invitations.length}>
              Invitations en attente
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
          <section id="inviter" aria-labelledby="inviter-titre" className="scroll-mt-20 space-y-3">
            <SectionTitle id="inviter-titre">Inviter quelqu&apos;un</SectionTitle>
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
  return (
    <h2 id={id} className="flex items-center gap-2 text-lg font-semibold text-foreground">
      {children}
      {count !== undefined && (
        <span className="text-sm font-normal tabular-nums text-muted-foreground">
          ({count})
        </span>
      )}
    </h2>
  );
}
