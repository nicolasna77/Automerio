import { formatConfigField, type MyServiceDTO } from "@/lib/catalog";
import { formatUsageCap } from "@/lib/usage-cap";
import { formatFrenchPhone } from "@/lib/phone-format";

type FactsLayout = "list" | "grid";

const MAX_GRID_ITEMS = 4;

// Un numéro de téléphone ne se coupe pas entre deux lignes : ses espaces
// deviennent insécables.
const NO_BREAK_SPACE = String.fromCharCode(0xa0);

function keepNumbersTogether(text: string): string {
  return text.replace(/\+?\d[\d ]{6,}\d/g, (number) => number.replaceAll(" ", NO_BREAK_SPACE));
}

export function Fact({
  label,
  children,
  layout = "list",
}: {
  label: string;
  children: React.ReactNode;
  layout?: FactsLayout;
}) {
  if (layout === "grid") {
    // En grille, en haut de la page d'une solution : le libellé au-dessus.
    // Une liste (horaires, redirections) passe à la ligne entre ses éléments
    // au lieu de couper une valeur en deux ; les textes longs sont coupés à
    // trois lignes. Le détail complet est dans les réglages, en haut à droite.
    const items = typeof children === "string" ? children.split(" · ") : null;
    return (
      <div className="min-w-0 text-sm">
        <dt className="text-muted-foreground">{label}</dt>
        {items && items.length > 1 ? (
          <dd className="mt-1 text-foreground">
            <ul className="space-y-0.5">
              {items.slice(0, MAX_GRID_ITEMS).map((entry) => (
                <li key={entry} className="break-words">
                  {keepNumbersTogether(entry)}
                </li>
              ))}
            </ul>
            {items.length > MAX_GRID_ITEMS && (
              <p className="mt-0.5 text-muted-foreground">
                et {items.length - MAX_GRID_ITEMS} autre{items.length - MAX_GRID_ITEMS > 1 ? "s" : ""}
              </p>
            )}
          </dd>
        ) : (
          <dd className="mt-1 line-clamp-3 break-words text-foreground">{children}</dd>
        )}
      </div>
    );
  }
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
  layout = "list",
}: {
  item: MyServiceDTO;
  showPhoneNumber?: boolean;
  showUsageCap?: boolean;
  layout?: FactsLayout;
}) {
  return (
    <dl
      className={
        layout === "grid" ? "grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3" : "@container"
      }
    >
      {item.service.usageCap && showUsageCap && (
        <Fact layout={layout} label="Plafond d'usage">
          {formatUsageCap(item.service.usageCap)}
        </Fact>
      )}
      {item.externalPhoneNumber && showPhoneNumber && (
        <Fact layout={layout} label="Numéro de téléphone">
          <span className="font-mono tabular-nums">{formatFrenchPhone(item.externalPhoneNumber)}</span>
        </Fact>
      )}
      {serviceConfigEntries(item).map(([key, value]) => {
        const field = item.service.configFields.find((f) => f.key === key);
        const displayValue = formatConfigField(field, key, value);
        return (
          <Fact key={key} layout={layout} label={field?.label ?? key}>
            {displayValue}
          </Fact>
        );
      })}
    </dl>
  );
}
