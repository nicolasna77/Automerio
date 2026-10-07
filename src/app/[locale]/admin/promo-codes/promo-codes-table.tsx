import { useTranslations } from "next-intl";
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

export function PromoCodesTable({ rows }: { rows: PromoCodeRow[] }) {
  const t = useTranslations("Admin.promoCodes");
  return (
    <Table>
      <TableCaption className="sr-only">{t("caption")}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.code")}</TableHead>
          <TableHead>{t("columns.discount")}</TableHead>
          <TableHead>{t("columns.conditions")}</TableHead>
          <TableHead className="text-right">{t("columns.uses")}</TableHead>
          <TableHead>{t("columns.expires")}</TableHead>
          <TableHead>{t("columns.state")}</TableHead>
          <TableHead className="text-right">{t("columns.action")}</TableHead>
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
              {row.services === null ? t("allServices") : row.services.join(", ")}
              {row.firstTimeOnly && (
                <span className="block text-xs text-muted-foreground">
                  {t("newCustomersOnly")}
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
                {t(`states.${row.state}`)}
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
