import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleSelector } from "../role-selector";
import { BanControl } from "../ban-control";
import { PasswordResetControl } from "../password-reset-control";

export function UserAccessCards({
  user,
  isSelf,
}: {
  user: { id: string; role: string | null; banned: boolean | null; banReason: string | null };
  isSelf: boolean;
}) {
  const t = useTranslations("Admin.userDetail.access");
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("role")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              {t("cannotChangeOwnRole")}
            </p>
          ) : (
            <RoleSelector
              userId={user.id}
              currentRole={user.role === "ADMIN" ? "ADMIN" : "CLIENT"}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("account")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              {t("cannotBanSelf")}
            </p>
          ) : (
            <BanControl
              userId={user.id}
              banned={!!user.banned}
              banReason={user.banReason}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("password")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              {t("cannotResetOwnPassword")}
            </p>
          ) : (
            <PasswordResetControl userId={user.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
