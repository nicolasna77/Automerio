import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { roleLabel } from "@/lib/organization-roles";
import { AcceptInvitation } from "./accept-invitation";

// La page lit la session : elle ne peut pas etre rendue a l'avance. Pas de
// `generateStaticParams` ici — sur une base vide il ne renverrait rien, Next
// classerait la route comme statique et chaque requete repondrait 500.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Invitation" };

/**
 * La page vers laquelle pointe l'e-mail d'invitation.
 *
 * Elle est publique a dessein : l'invite n'a le plus souvent pas encore de
 * compte. Elle ne divulgue que le nom de l'entreprise et le role propose — ce
 * que l'e-mail disait deja — et l'acceptation, elle, exige une session.
 */
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="contenu" className="flex-1">
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
                        // L'invitation vise une adresse : la rejoindre depuis un
                        // autre compte ferait entrer quelqu'un que personne
                        // n'a invite.
                        addressedToAnotherAccount={
                          session.user.email.toLowerCase() !==
                          invitation.email.toLowerCase()
                        }
                        invitedEmail={invitation.email}
                      />
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Connectez-vous avec {invitation.email}, ou créez votre
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
