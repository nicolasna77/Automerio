import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { parsePreferences } from "@/lib/email/preferences";
import { AccountForm } from "./account-form";
import { PasswordForm } from "./password-form";
import { NotificationPreferencesForm } from "./notification-preferences-form";
import { TwoFactorSection } from "./two-factor-section";
import { AccountDataSection } from "./account-data-section";

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
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profil</h1>
      <p className="mt-1 mb-8 text-muted-foreground">
        Vos informations, vos e-mails et la sécurité de votre compte.
      </p>
      <AccountForm initialAccount={initialAccount} />
      <p className="-mt-4 mb-4 text-sm text-muted-foreground">
        Vos entreprises se gèrent depuis le sélecteur d&apos;organisation, en haut de la barre latérale.
      </p>
      <NotificationPreferencesForm initialPreferences={initialPreferences} />
      {hasPassword && <PasswordForm />}
      <TwoFactorSection enabled={!!user.twoFactorEnabled} requiresPassword={hasPassword} />
      <AccountDataSection requiresPassword={hasPassword} />
    </div>
  );
}
