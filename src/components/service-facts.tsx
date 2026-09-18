import { formatConfigField, type MyServiceDTO } from "@/lib/catalog";

export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-border py-3 text-sm last:border-b-0 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

export function serviceConfigEntries(item: MyServiceDTO) {
  return Object.entries(item.configuration).filter(([, value]) => value);
}

export function hasServiceFacts(item: MyServiceDTO, showPhoneNumber: boolean) {
  return Boolean(
    item.service.usageCapLabel ||
      (item.externalPhoneNumber && showPhoneNumber) ||
      serviceConfigEntries(item).length > 0
  );
}

export function ServiceFacts({
  item,
  showPhoneNumber = true,
}: {
  item: MyServiceDTO;
  showPhoneNumber?: boolean;
}) {
  return (
    <dl>
      {item.service.usageCapLabel && (
        <Fact label="Plafond d'usage">{item.service.usageCapLabel}</Fact>
      )}
      {item.externalPhoneNumber && showPhoneNumber && (
        <Fact label="Numéro de téléphone">
          <span className="tabular-nums">{item.externalPhoneNumber}</span>
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
