import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { parsePreferences } from "@/lib/email/preferences";
import { AccountForm } from "./account-form";
import { PasswordForm } from "./password-form";
import { NotificationPreferencesForm } from "./notification-preferences-form";
import { TwoFactorSection } from "./two-factor-section";
import { AccountDataSection } from "./account-data-section";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilePage() {
  const session = await requireUser();

  const initialAccount = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? "",
  };

  const [user, credentialAccounts] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { notificationPreferences: true, twoFactorEnabled: true },
    }),
    db.account.count({ where: { userId: session.user.id, providerId: "credential" } }),
  ]);
  const initialPreferences = parsePreferences(user.notificationPreferences);
  const hasPassword = credentialAccounts > 0;

  return (
    <PageShell size="form">
      <PageHeader
        title="Profil"
        description="Vos informations, vos e-mails et la sécurité de votre compte."
      />
      <AccountForm initialAccount={initialAccount} />
      <p className="-mt-4 mb-4 text-sm text-muted-foreground">
        Vos entreprises se gèrent depuis le sélecteur d&apos;organisation, en haut de la barre latérale.
      </p>
      <NotificationPreferencesForm initialPreferences={initialPreferences} />
      {hasPassword && <PasswordForm />}
      <TwoFactorSection enabled={!!user.twoFactorEnabled} requiresPassword={hasPassword} />
      <AccountDataSection requiresPassword={hasPassword} />
    </PageShell>
  );
}
