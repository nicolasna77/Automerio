import { getTranslations } from "next-intl/server";
import { titleMetadata } from "@/i18n/metadata";
import { Link } from "@/i18n/navigation";
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
import { SENSITIVE_AUDIT_ACTIONS } from "@/lib/audit";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("adminAuditLog");

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
  const t = await getTranslations("Admin.auditLog");
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
    <PageShell size="wide">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <Card>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <Table>
              <TableCaption className="sr-only">{t("caption")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.action")}</TableHead>
                  <TableHead>{t("columns.target")}</TableHead>
                  <TableHead>{t("columns.detail")}</TableHead>
                  <TableHead>{t("columns.actor")}</TableHead>
                  <TableHead className="text-right">{t("columns.when")}</TableHead>
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
                        {t(`actions.${entry.action}`)}
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
        basePath="/admin/audit-log"
        params={{}}
        label={t("pagination")}
      />
    </PageShell>
  );
}
