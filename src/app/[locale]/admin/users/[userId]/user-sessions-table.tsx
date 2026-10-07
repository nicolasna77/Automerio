import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationNav } from "@/components/pagination-nav";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/catalog";
import { describeUserAgent } from "@/lib/user-agent";
import { RevokeSessionButton } from "../revoke-session-button";

export const SESSIONS_PAGE_SIZE = 20;

type SessionRow = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  token: string;
  expired: boolean;
};

export function UserSessionsTable({
  userId,
  userName,
  sessions,
  page,
  totalPages,
}: {
  userId: string;
  userName: string;
  sessions: SessionRow[];
  page: number;
  totalPages: number;
}) {
  const t = useTranslations("Admin.userDetail.sessions");
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        {t("heading")}
      </h2>
      <Card>
        {sessions.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("empty")}
            </p>
          </CardContent>
        ) : (
          <CardContent>
            <Table>
              <TableCaption className="sr-only">
                {t("caption", { name: userName })}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.connectedOn")}</TableHead>
                  <TableHead>{t("columns.state")}</TableHead>
                  <TableHead>{t("columns.expiresOn")}</TableHead>
                  <TableHead>{t("columns.ip")}</TableHead>
                  <TableHead>{t("columns.device")}</TableHead>
                  <TableHead className="sticky right-0 border-l border-border bg-card text-right">
                    {t("columns.action")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={s.expired ? "outline" : "secondary"}>
                        {s.expired ? t("expired") : t("active")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(s.expiresAt)}</TableCell>
                    <TableCell
                      className="max-w-36 truncate text-sm text-muted-foreground"
                      title={s.ipAddress ?? undefined}
                    >
                      {s.ipAddress ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" title={s.userAgent ?? undefined}>
                      {describeUserAgent(s.userAgent)}
                    </TableCell>
                    <TableCell className="sticky right-0 border-l border-border bg-card text-right">
                      <RevokeSessionButton
                        userId={userId}
                        sessionToken={s.token}
                        expired={s.expired}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <PaginationNav
              page={page}
              totalPages={totalPages}
              basePath={`/admin/users/${userId}`}
              params={{}}
              label={t("pagination")}
            />
          </CardContent>
        )}
      </Card>
    </section>
  );
}
