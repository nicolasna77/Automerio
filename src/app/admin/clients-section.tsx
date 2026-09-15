import { Building2 } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  formatPrice,
  type ClientServiceStatus,
} from "@/lib/catalog";
import { StatusBadge } from "@/components/status-badge";
import { PaginationNav } from "@/components/pagination-nav";
import { MarkActiveButton } from "./client-service-actions";
import { ClientServiceCard } from "./client-service-card";
import { ConnectionCell, NoteCell, configSummary } from "./client-service-cells";

const PAGE_SIZE = 20;

const VALID_STATUSES = new Set<ClientServiceStatus>([
  "PENDING_PAYMENT",
  "CONFIGURING",
  "ACTIVE",
  "CANCELED",
]);

function parseStatus(raw?: string): ClientServiceStatus | undefined {
  return raw && VALID_STATUSES.has(raw as ClientServiceStatus)
    ? (raw as ClientServiceStatus)
    : undefined;
}

export async function ClientsSection({
  q,
  status: rawStatus,
  page: rawPage,
}: {
  q?: string;
  status?: string;
  page?: string;
}) {
  const status = parseStatus(rawStatus);
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
    ...(status ? { clientServices: { some: { status } } } : {}),
  };

  const [total, clients] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        members: { include: { organization: true } },
        clientServices: {
          include: { service: true, organization: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageParams = { q, status: rawStatus };

  return (
    <div>
      <div className="space-y-4">
        {clients.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun client ne correspond à ces critères.
          </p>
        )}
        {clients.map((client) => (
          <Card key={client.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>{client.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {client.email}
                    {client.members.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3.5" aria-hidden="true" />
                        {client.members.map((m) => m.organization.name).join(", ")}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {client.clientServices.length} solution
                  {client.clientServices.length > 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            {client.clientServices.length > 0 && (
              <CardContent>
                <div className="hidden md:block">
                  <Table>
                    <TableCaption className="sr-only">
                      Solutions de {client.name}
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Solution</TableHead>
                        <TableHead>Organisation</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Configuration</TableHead>
                        <TableHead>Note pour le client</TableHead>
                        <TableHead>Connexion externe</TableHead>
                        <TableHead className="text-right">Prix</TableHead>
                        <TableHead className="sticky right-0 border-l border-border bg-card text-right">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.clientServices.map((cs) => (
                        <TableRow key={cs.id}>
                          <TableCell className="font-medium">
                            {cs.name}
                            {cs.name !== cs.service.name && (
                              <p className="text-xs font-normal text-muted-foreground">
                                {cs.service.name}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {cs.organization.name}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={cs.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {configSummary(cs)}
                          </TableCell>
                          <TableCell>
                            <NoteCell cs={cs} />
                          </TableCell>
                          <TableCell>
                            <ConnectionCell cs={cs} />
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPrice(
                              cs.service.setupFeeCents,
                              cs.service.monthlyPriceCents
                            )}
                          </TableCell>
                          <TableCell className="sticky right-0 border-l border-border bg-card text-right">
                            {cs.status === "CONFIGURING" && (
                              <MarkActiveButton clientServiceId={cs.id} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <ul className="space-y-3 md:hidden">
                  {client.clientServices.map((cs) => (
                    <ClientServiceCard key={cs.id} cs={cs} />
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

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
