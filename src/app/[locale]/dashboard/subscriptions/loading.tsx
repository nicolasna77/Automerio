import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/page-shell";

export default function Loading() {
  const t = useTranslations("Dashboard.loading");
  return (
    <PageShell size="content"
      role="status"
      aria-label={t("subscriptions")}
    >
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-2 h-5 w-72" />

      <Skeleton className="mt-8 h-24 w-full rounded-4xl" />

      <div className="mt-8 space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-4xl" />
        ))}
      </div>
    </PageShell>
  );
}
