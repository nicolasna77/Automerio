import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/page-shell";

export default function Loading() {
  const t = useTranslations("Dashboard.loading");
  return (
    <PageShell size="content" role="status" aria-label={t("configuration")}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-6 h-7 w-48" />
      <Skeleton className="mt-2 h-5 w-64" />
      <div className="mt-8 space-y-6">
        <Skeleton className="h-72 w-full rounded-4xl" />
        <Skeleton className="h-96 w-full rounded-4xl" />
      </div>
    </PageShell>
  );
}
