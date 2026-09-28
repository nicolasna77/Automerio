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

  const [total, users] = await Promise.all([
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
              Aucun utilisateur ne correspond à ces critères.
            </p>
          </CardContent>
        ) : (
          <CardContent>
            <Table>
              <TableCaption className="sr-only">
                Utilisateurs de l&apos;application
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Inscrit le</TableHead>
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
                        {user.role ?? "CLIENT"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.banned ? (
                        <Badge variant="destructive">Banni</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Actif</span>
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
        label="Pagination des utilisateurs"
      />
    </div>
  );
}
