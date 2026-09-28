import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/catalog";
import { DeactivatePromoCodeButton } from "./deactivate-promo-code-button";

export type PromoCodeState = "active" | "expired" | "exhausted" | "inactive";

export type PromoCodeRow = {
  id: string;
  code: string;
  state: PromoCodeState;
  discount: string;
  services: string[] | null;
  firstTimeOnly: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: Date | null;
};

const STATE_LABELS: Record<PromoCodeState, string> = {
  active: "Actif",
  expired: "Expiré",
  exhausted: "Épuisé",
  inactive: "Désactivé",
};

export function PromoCodesTable({ rows }: { rows: PromoCodeRow[] }) {
  return (
    <Table>
      <TableCaption className="sr-only">Codes promo</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Remise</TableHead>
          <TableHead>Conditions</TableHead>
          <TableHead className="text-right">Utilisations</TableHead>
          <TableHead>Expire le</TableHead>
          <TableHead>État</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            className={row.state === "active" ? undefined : "text-muted-foreground"}
          >
            <TableCell className="font-medium text-foreground">{row.code}</TableCell>
            <TableCell className="min-w-56 whitespace-normal">{row.discount}</TableCell>
            <TableCell className="min-w-44 whitespace-normal text-sm">
              {row.services === null ? "Toutes les solutions" : row.services.join(", ")}
              {row.firstTimeOnly && (
                <span className="block text-xs text-muted-foreground">
                  Nouveaux clients seulement
                </span>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.maxRedemptions === null
                ? row.timesRedeemed
                : `${row.timesRedeemed} / ${row.maxRedemptions}`}
            </TableCell>
            <TableCell>{row.expiresAt ? formatDate(row.expiresAt) : "—"}</TableCell>
            <TableCell>
              <Badge variant={row.state === "active" ? "secondary" : "outline"}>
                {STATE_LABELS[row.state]}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {row.state !== "inactive" && (
                <DeactivatePromoCodeButton id={row.id} code={row.code} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
