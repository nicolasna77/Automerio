import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/page-shell";

export default function Loading() {
  const t = useTranslations("Dashboard.loading");
  return (
    <PageShell size="content" role="status" aria-label={t("instagramDrafts")}>
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-2 h-5 w-full max-w-xl" />
      <div className="mt-8 space-y-6">
        <Skeleton className="h-80 w-full rounded-4xl" />
        <Skeleton className="h-48 w-full rounded-4xl" />
      </div>
    </PageShell>
  );
}
