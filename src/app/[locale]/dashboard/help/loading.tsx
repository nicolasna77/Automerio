import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/page-shell";

export default function Loading() {
  const t = useTranslations("Dashboard.loading");
  return (
    <PageShell size="wide" role="status" aria-label={t("help")}>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="mt-2 h-5 w-80" />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    </PageShell>
  );
}
