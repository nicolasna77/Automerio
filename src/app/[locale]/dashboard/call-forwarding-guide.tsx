"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, PhoneForwarded } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LineType = "mobile" | "fixe";
type BoxOperator = "orange" | "sfr" | "bouygues" | "free" | "autre";

const BOX_OPERATORS: BoxOperator[] = ["orange", "sfr", "bouygues", "free", "autre"];

const code = (chunks: React.ReactNode) => <code className="font-mono">{chunks}</code>;

function MobileInstructions({ targetNumber }: { targetNumber: string }) {
  const t = useTranslations("Dashboard.forwardingGuide");
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">{t("mobileIntro")}</p>
      <ul className="space-y-1.5">
        <li className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
          <span className="text-foreground">{t("enableAll")}</span>
          <code className="shrink-0 font-mono text-xs tabular-nums text-foreground">
            **21*{targetNumber}#
          </code>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
          <span className="text-foreground">{t("disable")}</span>
          <code className="shrink-0 font-mono text-xs text-foreground">
            ##21#
          </code>
        </li>
      </ul>
      <p className="text-xs text-muted-foreground">
        {t.rich("conditional", { number: targetNumber, code })}
      </p>
    </div>
  );
}

function FixedLineInstructions({ targetNumber }: { targetNumber: string }) {
  const t = useTranslations("Dashboard.forwardingGuide");
  const [operator, setOperator] = useState<BoxOperator>("orange");

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-1.5">
        {BOX_OPERATORS.map((item) => (
          <Button
            key={item}
            type="button"
            variant="outline"
            size="xs"
            className={cn(
              operator === item && "border-primary bg-primary/10 text-primary"
            )}
            aria-pressed={operator === item}
            onClick={() => setOperator(item)}
          >
            {t(`operators.${item}`)}
          </Button>
        ))}
      </div>
      <p className="text-muted-foreground">{t(`boxInstructions.${operator}`)}</p>
      <p className="text-xs text-muted-foreground">
        {t.rich("boxShortcut", { number: targetNumber, code })}
      </p>
    </div>
  );
}

export function CallForwardingGuide({ targetNumber }: { targetNumber: string }) {
  const t = useTranslations("Dashboard.forwardingGuide");
  const [lineType, setLineType] = useState<LineType>("mobile");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(targetNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <PhoneForwarded
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t("title")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
            <span className="flex-1 font-mono text-sm tabular-nums text-foreground">
              {targetNumber}
            </span>
            <Button type="button" size="xs" variant="ghost" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check aria-hidden="true" data-icon="inline-start" />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy aria-hidden="true" data-icon="inline-start" />
                  {t("copy")}
                </>
              )}
            </Button>
          </div>

          <div className="inline-flex items-center gap-0.5 rounded-4xl border border-border p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className={cn(lineType === "mobile" && "bg-muted text-foreground")}
              aria-pressed={lineType === "mobile"}
              onClick={() => setLineType("mobile")}
            >
              {t("mobile")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className={cn(lineType === "fixe" && "bg-muted text-foreground")}
              aria-pressed={lineType === "fixe"}
              onClick={() => setLineType("fixe")}
            >
              {t("fixed")}
            </Button>
          </div>

          {lineType === "mobile" ? (
            <MobileInstructions targetNumber={targetNumber} />
          ) : (
            <FixedLineInstructions targetNumber={targetNumber} />
          )}
        </div>
      </div>
    </div>
  );
}
