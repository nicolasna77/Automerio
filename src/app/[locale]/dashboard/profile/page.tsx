import { titleMetadata } from "@/i18n/metadata";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { parsePreferences } from "@/lib/email/preferences";
import { AccountForm } from "./account-form";
import { PasswordForm } from "./password-form";
import { NotificationPreferencesForm } from "./notification-preferences-form";
import { TwoFactorSection } from "./two-factor-section";
import { AccountDataSection } from "./account-data-section";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("profile");

export default async function ProfilePage() {
  const session = await requireUser();

  const initialAccount = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? "",
  };

  const [user, credentialAccounts, t] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { notificationPreferences: true, twoFactorEnabled: true },
    }),
    db.account.count({ where: { userId: session.user.id, providerId: "credential" } }),
    getTranslations("Dashboard.profile"),
  ]);
  const initialPreferences = parsePreferences(user.notificationPreferences);
  const hasPassword = credentialAccounts > 0;

  return (
    <PageShell size="form">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <AccountForm initialAccount={initialAccount} />
      <p className="-mt-4 mb-4 text-sm text-muted-foreground">
        {t("organizationsHint")}
      </p>
      <NotificationPreferencesForm initialPreferences={initialPreferences} />
      {hasPassword && <PasswordForm />}
      <TwoFactorSection enabled={!!user.twoFactorEnabled} requiresPassword={hasPassword} />
      <AccountDataSection requiresPassword={hasPassword} />
    </PageShell>
  );
}
