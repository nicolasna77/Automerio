import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Prisma } from "@prisma/client";
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
import { formatDate, type ClientServiceStatus } from "@/lib/catalog";
import { StatusBadge } from "@/components/status-badge";
import { PaginationNav } from "@/components/pagination-nav";

const PAGE_SIZE = 20;

const VALID_STATUSES = new Set<ClientServiceStatus>([
  "PENDING_PAYMENT",
  "CONFIGURING",
  "ACTIVE",
  "CANCELED",
]);

type ClientScope = "with" | "without" | "all";

function parseStatus(raw?: string): ClientServiceStatus | undefined {
  return raw && VALID_STATUSES.has(raw as ClientServiceStatus)
    ? (raw as ClientServiceStatus)
    : undefined;
}

function parseClientScope(raw?: string): ClientScope {
  return raw === "without" || raw === "all" ? raw : "with";
}

function ClientServices({
  services,
}: {
  services: { id: string; name: string; status: ClientServiceStatus }[];
}) {
  if (services.length === 0) {
    return <span className="text-sm text-muted-foreground">Aucune solution</span>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {services.map((cs) => (
        <li key={cs.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-foreground">{cs.name}</span>
          <StatusBadge status={cs.status} />
        </li>
      ))}
    </ul>
  );
}

export async function ClientsSection({
  q,
  status: rawStatus,
  scope: rawScope,
  page: rawPage,
}: {
  q?: string;
  status?: string;
  scope?: string;
  page?: string;
}) {
  const status = parseStatus(rawStatus);
  const scope = parseClientScope(rawScope);
  const page = Math.max(1, Number(rawPage) || 1);

  const where: Prisma.UserWhereInput = {
    role: { not: "ADMIN" },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { members: { some: { organization: { name: { contains: q, mode: "insensitive" } } } } },
          ],
        }
      : {}),
    ...(status
      ? { clientServices: { some: { status } } }
      : scope === "with"
        ? { clientServices: { some: {} } }
        : scope === "without"
          ? { clientServices: { none: {} } }
          : {}),
  };

  const [total, clients] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        members: { select: { organization: { select: { name: true } } } },
        clientServices: {
          select: { id: true, name: true, status: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageParams = { q, status: rawStatus, scope: rawScope };

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun client ne correspond à ces critères.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Card className="hidden md:flex">
        <CardContent>
          <Table>
            <TableCaption className="sr-only">
              Clients, du plus récent au plus ancien
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Solutions</TableHead>
                <TableHead className="text-right">Inscription</TableHead>
                <TableHead>
                  <span className="sr-only">Fiche</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className="align-top">
                  <TableCell className="whitespace-normal">
                    <Link
                      href={`/admin/users/${client.id}`}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {client.name}
                    </Link>
                    <p className="text-xs whitespace-nowrap text-muted-foreground">{client.email}</p>
                  </TableCell>
                  <TableCell className="text-sm whitespace-normal text-muted-foreground">
                    {client.members.map((m) => m.organization.name).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <ClientServices services={client.clientServices} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDate(client.createdAt)}
                  </TableCell>
                  <TableCell className="w-10 text-right">
                    <Link
                      href={`/admin/users/${client.id}`}
                      aria-label={`Ouvrir la fiche de ${client.name}`}
                      className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ul className="space-y-3 md:hidden">
        {clients.map((client) => (
          <li key={client.id}>
            <Card size="sm" className="relative has-[a:focus-visible]:focus-ring">
              <CardContent className="space-y-3">
                <div>
                  <Link
                    href={`/admin/users/${client.id}`}
                    className="font-medium text-foreground outline-none after:absolute after:inset-0"
                  >
                    {client.name}
                  </Link>
                  <p className="text-xs [overflow-wrap:anywhere] text-muted-foreground">{client.email}</p>
                  {client.members.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {client.members.map((m) => m.organization.name).join(", ")}
                    </p>
                  )}
                </div>
                <ClientServices services={client.clientServices} />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <PaginationNav
        page={page}
        totalPages={totalPages}
        basePath="/admin"
        params={pageParams}
        label="Pagination des clients"
      />
    </div>
  );
}
