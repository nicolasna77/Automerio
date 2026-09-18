import type { Metadata } from "next";
import Link from "next/link";
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
import { PaginationNav } from "@/components/pagination-nav";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { AUDIT_ACTION_LABELS, SENSITIVE_AUDIT_ACTIONS } from "@/lib/audit";

export const metadata: Metadata = { title: "Journal d'administration" };

const PAGE_SIZE = 50;

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);

  const [total, entries] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Journal d&apos;administration
        </h1>
        <p className="mt-1 text-muted-foreground">
          Qui a fait quoi sur les comptes et le catalogue. Les entrées ne sont
          ni modifiables ni supprimables depuis l&apos;application.
        </p>
      </div>

      <Card className="mt-6">
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune action enregistrée pour l&apos;instant. Un bannissement, un
              changement de rôle ou une modification du catalogue apparaîtra ici.
            </p>
          ) : (
            <Table>
              <TableCaption className="sr-only">
                Actions d&apos;administration, de la plus récente à la plus ancienne
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Cible</TableHead>
                  <TableHead>Détail</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead className="text-right">Quand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge
                        variant={
                          SENSITIVE_AUDIT_ACTIONS.has(entry.action)
                            ? "default"
                            : "secondary"
                        }
                      >
                        {AUDIT_ACTION_LABELS[entry.action]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium whitespace-normal">
                      {entry.targetType === "user" ? (
                        <Link
                          href={`/admin/users/${entry.targetId}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {entry.targetLabel}
                        </Link>
                      ) : (
                        entry.targetLabel
                      )}
                    </TableCell>
                    <TableCell className="min-w-64 text-sm whitespace-normal text-muted-foreground">
                      {entry.detail ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.actorLabel}
                    </TableCell>
                    <TableCell className="text-right text-sm whitespace-nowrap text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PaginationNav
        page={page}
        totalPages={totalPages}
        basePath="/admin/journal"
        params={{}}
        label="Pagination du journal"
      />
    </div>
  );
}
