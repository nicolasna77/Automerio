import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/page-shell";

// Chargement commun aux pages de l'admin qui n'ont pas le leur : titre, puis
// une liste, la forme la plus fréquente (utilisateurs, solutions, journal…).
export default function Loading() {
  const t = useTranslations("Admin.skeletons");
  return (
    <PageShell size="wide" role="status" aria-label={t("page")}>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-5 w-72" />
      <Card size="sm" className="mt-6 px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b border-border py-4 first:pt-0 last:border-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="mt-2 h-3.5 w-32" />
            </div>
            <Skeleton className="h-6 w-20 shrink-0" />
          </div>
        ))}
      </Card>
    </PageShell>
  );
}
