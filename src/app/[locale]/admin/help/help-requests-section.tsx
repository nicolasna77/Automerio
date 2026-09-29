import { Link } from "@/i18n/navigation";
import { Building2 } from "lucide-react";
import type { HelpRequestStatus, Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaginationNav } from "@/components/pagination-nav";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/catalog";
import { HELP_REQUEST_STATUS_LABELS, toHelpRequestMessageDTOs } from "@/lib/help";
import { HelpRequestThread } from "@/components/help-request-thread";
import { HelpRequestReplyForm } from "./help-request-reply-form";
import { HelpRequestStatusButton } from "./help-request-status-button";
import { BulkResolveBar, BULK_FORM_ID } from "./bulk-resolve-bar";

const PAGE_SIZE = 20;

function parseStatusFilter(raw?: string): HelpRequestStatus | "all" {
  if (raw === "resolved") return "RESOLVED";
  if (raw === "all") return "all";
  return "OPEN";
}

export async function HelpRequestsSection({
  status: rawStatus,
  page: rawPage,
}: {
  status?: string;
  page?: string;
}) {
  const statusFilter = parseStatusFilter(rawStatus);
  const page = Math.max(1, Number(rawPage) || 1);

  const where: Prisma.HelpRequestWhereInput =
    statusFilter === "all" ? {} : { status: statusFilter };

  const [total, requests] = await Promise.all([
    db.helpRequest.count({ where }),
    db.helpRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { name: true } },
        clientService: { select: { name: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true } } },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openCount = requests.filter((r) => r.status === "OPEN").length;

  return (
    <div>
      <BulkResolveBar hasOpenRequests={openCount > 0} />

      <div className="space-y-4">
        {requests.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune demande ne correspond à ces critères.
          </p>
        )}
        {requests.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  {r.status === "OPEN" && (
                    <input
                      type="checkbox"
                      name="helpRequestIds"
                      value={r.id}
                      form={BULK_FORM_ID}
                      aria-label={`Sélectionner « ${r.subject} »`}
                      className="mt-1.5 size-4 shrink-0 accent-primary"
                    />
                  )}
                  <div className="min-w-0">
                  <CardTitle>{r.subject}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/admin/users/${r.user.id}`}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      {r.user.name}
                    </Link>
                    <span>{r.user.email}</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="size-3.5" aria-hidden="true" />
                      {r.organization.name}
                    </span>
                  </CardDescription>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">
                    {r.clientService ? r.clientService.name : "Question générale"}
                  </Badge>
                  <Badge variant={r.status === "OPEN" ? "default" : "secondary"}>
                    {HELP_REQUEST_STATUS_LABELS[r.status]}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {r.message}
              </p>
              <HelpRequestThread messages={toHelpRequestMessageDTOs(r.messages)} />
              <HelpRequestReplyForm helpRequestId={r.id} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Reçue le {formatDate(r.createdAt)}
                  {r.resolvedAt && ` · Traitée le ${formatDate(r.resolvedAt)}`}
                </p>
                <HelpRequestStatusButton helpRequestId={r.id} status={r.status} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PaginationNav
        page={page}
        totalPages={totalPages}
        basePath="/admin/help"
        params={{ status: rawStatus }}
        label="Pagination des demandes"
      />
    </div>
  );
}
