import { titleMetadata } from "@/i18n/metadata";
import { Link } from "@/i18n/navigation";
import { Building2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { roleLabel } from "@/lib/organization-roles";
import { maskEmail } from "@/lib/mask-email";
import { AcceptInvitation } from "./accept-invitation";

export const dynamic = "force-dynamic";

export const generateMetadata = titleMetadata("invitation");

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  const [session, invitation] = await Promise.all([
    getSession(),
    db.invitation.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        organization: { select: { name: true } },
      },
    }),
  ]);

  const usable =
    invitation && invitation.status === "pending" && invitation.expiresAt > new Date();
  // Le lien peut circuler : l'adresse invitée ne s'affiche en entier qu'à la
  // personne connectée avec cette adresse.
  const isInvitee =
    !!session &&
    !!invitation &&
    session.user.email.toLowerCase() === invitation.email.toLowerCase();
  const shownEmail = invitation
    ? isInvitee
      ? invitation.email
      : maskEmail(invitation.email)
    : "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="content" className="flex-1">
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-lg px-4 sm:px-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
                <CardTitle className="text-base">
                  {usable ? invitation.organization.name : "Invitation"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {!usable ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Cette invitation n&apos;est plus valable : elle a peut-être
                      déjà été acceptée, annulée, ou elle a expiré. Demandez à la
                      personne qui vous a invité de vous en envoyer une nouvelle.
                    </p>
                    <Link href="/" className={buttonVariants({ variant: "outline" })}>
                      Retour à l&apos;accueil
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-foreground">
                      Vous êtes invité à rejoindre{" "}
                      <strong>{invitation.organization.name}</strong> en tant que{" "}
                      {roleLabel(invitation.role ?? "member").toLowerCase()}.
                    </p>
                    {session ? (
                      <AcceptInvitation
                        invitationId={invitation.id}
                        organizationName={invitation.organization.name}
                        addressedToAnotherAccount={!isInvitee}
                        invitedEmail={shownEmail}
                      />
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Connectez-vous avec {shownEmail}, ou créez votre
                          compte avec cette adresse, pour rejoindre
                          l&apos;entreprise.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/signup?invitation=${invitation.id}`}
                            className={buttonVariants()}
                          >
                            Créer mon compte
                          </Link>
                          <Link
                            href={`/login?invitation=${invitation.id}`}
                            className={buttonVariants({ variant: "outline" })}
                          >
                            J&apos;ai déjà un compte
                          </Link>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
