import { Download, ListChecks } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { titleMetadata } from "@/i18n/metadata";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/catalog";
import { isWaitlistMode } from "@/lib/launch-mode";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("adminWaitlist");

export default async function AdminWaitlistPage() {
  await requireAdmin();
  const t = await getTranslations("Admin.waitlist");

  const entries = await db.waitlistEntry.findMany({ orderBy: { createdAt: "desc" } });
  const callbacks = entries.filter((e) => e.wantsCallback).length;
  const newsletter = entries.filter((e) => e.wantsNewsletter).length;

  return (
    <PageShell size="wide">
      <PageHeader
        title={t("title")}
        description={
          <>
            {t("summary", { count: entries.length, callbacks, newsletter })}{" "}
            {isWaitlistMode() ? t("waitlistMode") : t("openMode")}
          </>
        }
        actions={
          entries.length > 0 ? (
            <Link href="/admin/export/waitlist" prefetch={false} className={buttonVariants({ variant: "outline" })}>
              <Download data-icon="inline-start" aria-hidden="true" />
              {t("export")}
            </Link>
          ) : null
        }
      />

      {entries.length === 0 ? (
        <EmptyState icon={ListChecks} tone="neutral" title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.createdAt")}</TableHead>
                  <TableHead>{t("columns.email")}</TableHead>
                  <TableHead>{t("columns.name")}</TableHead>
                  <TableHead>{t("columns.company")}</TableHead>
                  <TableHead>{t("columns.phone")}</TableHead>
                  <TableHead>{t("columns.callback")}</TableHead>
                  <TableHead>{t("columns.launch")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(entry.createdAt)}</TableCell>
                    <TableCell>
                      <a href={`mailto:${entry.email}`} className="underline-offset-4 hover:underline">
                        {entry.email}
                      </a>
                    </TableCell>
                    <TableCell>{entry.name ?? ""}</TableCell>
                    <TableCell>{entry.company ?? ""}</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {entry.phone ? <a href={`tel:${entry.phone}`}>{entry.phone}</a> : ""}
                    </TableCell>
                    <TableCell>{entry.wantsCallback ? t("yes") : t("no")}</TableCell>
                    <TableCell>{entry.wantsNewsletter ? t("yes") : t("no")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
