import { CheckCheck, Download } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { bulkResolveHelpRequests } from "./actions";

export const BULK_FORM_ID = "bulk-resolve-help-requests";

export function BulkResolveBar({ hasOpenRequests }: { hasOpenRequests: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <form id={BULK_FORM_ID} action={bulkResolveHelpRequests}>
        {hasOpenRequests ? (
          <Button type="submit" variant="outline" size="sm">
            <CheckCheck data-icon="inline-start" />
            Marquer la sélection comme traitée
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune demande en attente sur cette page.
          </p>
        )}
      </form>

      <Link
        href="/admin/export/help-requests"
        prefetch={false}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <Download data-icon="inline-start" />
        Exporter en CSV
      </Link>
    </div>
  );
}
