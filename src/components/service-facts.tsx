import { useTranslations } from "next-intl";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import { formatConfigField, type MyServiceDTO } from "@/lib/catalog";
import { formatFrenchPhone } from "@/lib/phone-format";

export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-border py-3 text-sm last:border-b-0 @lg:grid-cols-[minmax(0,11rem)_1fr] @lg:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

export function serviceConfigEntries(item: MyServiceDTO) {
  return Object.entries(item.configuration).filter(([, value]) => value);
}

export function hasServiceFacts(
  item: MyServiceDTO,
  showPhoneNumber: boolean,
  showUsageCap = true
) {
  return Boolean(
    (item.service.usageCap && showUsageCap) ||
      (item.externalPhoneNumber && showPhoneNumber) ||
      serviceConfigEntries(item).length > 0
  );
}

export function ServiceFacts({
  item,
  showPhoneNumber = true,
  showUsageCap = true,
}: {
  item: MyServiceDTO;
  showPhoneNumber?: boolean;
  showUsageCap?: boolean;
}) {
  const t = useTranslations("Dashboard.facts");
  const price = usePriceFormatter();
  return (
    <dl className="@container">
      {item.service.usageCap && showUsageCap && (
        <Fact label={t("usageCap")}>
          {price.usageCap(item.service.usageCap)}
        </Fact>
      )}
      {item.externalPhoneNumber && showPhoneNumber && (
        <Fact label={t("phoneNumber")}>
          <span className="font-mono tabular-nums">{formatFrenchPhone(item.externalPhoneNumber)}</span>
        </Fact>
      )}
      {serviceConfigEntries(item).map(([key, value]) => {
        const field = item.service.configFields.find((f) => f.key === key);
        const displayValue = formatConfigField(field, key, value);
        return (
          <Fact key={key} label={field?.label ?? key}>
            {displayValue}
          </Fact>
        );
      })}
    </dl>
  );
}
