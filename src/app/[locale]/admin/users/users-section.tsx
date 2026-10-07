import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/catalog";
import { PaginationNav } from "@/components/pagination-nav";

const PAGE_SIZE = 20;

export async function UsersSection({
  q,
  role,
  page: rawPage,
}: {
  q?: string;
  role?: string;
  page?: string;
}) {
  const page = Math.max(1, Number(rawPage) || 1);

  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { members: { some: { organization: { name: { contains: q, mode: "insensitive" } } } } },
          ],
        }
      : {}),
    ...(role === "ADMIN" || role === "CLIENT" ? { role } : {}),
  };

  const [t, total, users] = await Promise.all([
    getTranslations("Admin.users"),
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { members: { include: { organization: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageParams = { q, role };

  return (
    <div>
      <Card>
        {users.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("empty")}
            </p>
          </CardContent>
        ) : (
          <CardContent>
            <Table>
              <TableCaption className="sr-only">
                {t("caption")}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.name")}</TableHead>
                  <TableHead>{t("columns.organization")}</TableHead>
                  <TableHead>{t("columns.role")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  <TableHead>{t("columns.signedUp")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {user.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.members.length > 0
                        ? user.members.map((m) => m.organization.name).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                        {t(`role.${user.role === "ADMIN" ? "ADMIN" : "CLIENT"}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.banned ? (
                        <Badge variant="destructive">{t("banned")}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t("active")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      <PaginationNav
        page={page}
        totalPages={totalPages}
        basePath="/admin/users"
        params={pageParams}
        label={t("pagination")}
      />
    </div>
  );
}
