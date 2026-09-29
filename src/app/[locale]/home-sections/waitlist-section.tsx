import { getTranslations } from "next-intl/server";
import { WaitlistForm } from "./waitlist-form";

export async function WaitlistSection() {
  const t = await getTranslations("Waitlist");
  return (
    <section
      id="waitlist"
      aria-labelledby="waitlist-heading"
      className="scroll-mt-20 border-t border-border py-20 sm:py-24"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div>
          <h2
            id="waitlist-heading"
            className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("lead")}</p>
        </div>
        <WaitlistForm />
      </div>
    </section>
  );
}
