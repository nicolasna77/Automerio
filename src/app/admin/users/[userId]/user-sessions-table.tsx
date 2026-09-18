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
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        Sessions (historique de connexion)
      </h2>
      <Card>
        {sessions.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aucune session enregistrée.
            </p>
          </CardContent>
        ) : (
          <CardContent>
            <Table>
              <TableCaption className="sr-only">
                Sessions de {userName}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Connecté le</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead>Expire le</TableHead>
                  <TableHead>Adresse IP</TableHead>
                  <TableHead>Appareil</TableHead>
                  <TableHead className="sticky right-0 border-l border-border bg-card text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={s.expired ? "outline" : "secondary"}>
                        {s.expired ? "Expirée" : "Active"}
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
              label="Pagination des sessions"
            />
          </CardContent>
        )}
      </Card>
    </section>
  );
}
