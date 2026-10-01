import { getTranslations } from "next-intl/server";
import { Check, Minus } from "lucide-react";

const ROWS = ["setup", "connect", "monitor", "fix"] as const;

export async function WhySection() {
  const t = await getTranslations("Home.why");
  return (
    <section aria-labelledby="why-heading" className="border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-medium text-muted-foreground">{t("eyebrow")}</span>
          <h2
            id="why-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            <span className="block">{t("heading")}</span>
            <span className="block">{t("headingSecond")}</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="p-4 text-sm font-medium text-muted-foreground sm:px-6">
                  {t("software")}
                </th>
                <th scope="col" className="border-l border-border bg-primary/5 p-4 text-sm font-semibold text-primary sm:px-6">
                  {t("us")}
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row} className="border-b border-border last:border-b-0">
                  <td className="p-4 text-muted-foreground sm:px-6">
                    <span className="flex items-start gap-2">
                      <Minus className="mt-1 size-4 shrink-0" aria-hidden="true" />
                      {t(`rows.${row}.software`)}
                    </span>
                  </td>
                  <td className="border-l border-border bg-primary/5 p-4 font-medium text-foreground sm:px-6">
                    <span className="flex items-start gap-2">
                      <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                      {t(`rows.${row}.us`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
