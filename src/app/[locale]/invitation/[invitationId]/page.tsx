import { titleMetadata } from "@/i18n/metadata";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getLabels } from "@/lib/labels-server";
import { AcceptInvitation } from "./accept-invitation";

export const dynamic = "force-dynamic";


export const generateMetadata = titleMetadata("invitation");

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  const [t, labels, session, invitation] = await Promise.all([
    getTranslations("Invitation"),
    getLabels(),
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
  const role = invitation?.role ?? "member";
  const roleName = labels.role(role);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="content" className="flex-1">
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-lg px-4 sm:px-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
                <CardTitle as="h1" className="text-base">
                  {usable ? invitation.organization.name : t("title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {!usable ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {t("unusable")}
                    </p>
                    <Link href="/" className={buttonVariants({ variant: "outline" })}>
                      {t("backHome")}
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-foreground">
                      {t.rich("invited", {
                        organization: invitation.organization.name,
                        role: roleName.toLowerCase(),
                        strong: (chunks) => <strong>{chunks}</strong>,
                      })}
                    </p>
                    {session ? (
                      <AcceptInvitation
                        invitationId={invitation.id}
                        organizationName={invitation.organization.name}
                        addressedToAnotherAccount={
                          session.user.email.toLowerCase() !==
                          invitation.email.toLowerCase()
                        }
                        invitedEmail={invitation.email}
                      />
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {t("signInPrompt", { email: invitation.email })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/signup?invitation=${invitation.id}`}
                            className={buttonVariants()}
                          >
                            {t("createAccount")}
                          </Link>
                          <Link
                            href={`/login?invitation=${invitation.id}`}
                            className={buttonVariants({ variant: "outline" })}
                          >
                            {t("haveAccount")}
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
