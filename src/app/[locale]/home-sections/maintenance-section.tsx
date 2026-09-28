import { LifeBuoy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import type { ServiceDTO } from "@/lib/catalog";
import { getPriceFormatter } from "@/lib/price-format-server";

const PERKS = ["priority", "dedicated", "monthly"] as const;

export async function MaintenanceSection({ services }: { services: ServiceDTO[] }) {
  const support = services.find((s) => s.slug === "support-prioritaire");
  if (!support) return null;
  const [t, price] = await Promise.all([getTranslations("Home.support"), getPriceFormatter()]);

  return (
    <section id="subscription" className="border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <LifeBuoy className="size-4" />
              </span>
              {support.monthlyPriceCents !== null && (
                <div className="text-right">
                  <Badge>{price.perMonthWithVat(support.monthlyPriceCents)}</Badge>
                  <span className="mt-1 block text-[0.6875rem] text-muted-foreground">
                    {price.excludingVatSuffix(support.monthlyPriceCents)}
                  </span>
                </div>
              )}
            </div>
            <CardTitle>{support.name}</CardTitle>
            <CardDescription>
              {t("description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
              {PERKS.map((key) => (
                <li key={key}>
                  <p className="font-medium text-foreground">{t(`perks.${key}.title`)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(`perks.${key}.description`)}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
