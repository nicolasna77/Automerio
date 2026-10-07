import { CheckCheck, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { bulkResolveHelpRequests } from "./actions";

export const BULK_FORM_ID = "bulk-resolve-help-requests";

export function BulkResolveBar({ hasOpenRequests }: { hasOpenRequests: boolean }) {
  const t = useTranslations("Admin.help.bulk");
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <form id={BULK_FORM_ID} action={bulkResolveHelpRequests}>
        {hasOpenRequests ? (
          <Button type="submit" variant="outline" size="sm">
            <CheckCheck data-icon="inline-start" />
            {t("resolve")}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("noneOpen")}
          </p>
        )}
      </form>

      <Link
        href="/admin/export/help-requests"
        prefetch={false}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <Download data-icon="inline-start" />
        {t("export")}
      </Link>
    </div>
  );
}
