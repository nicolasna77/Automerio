import { Link } from "@/i18n/navigation";
import { FaqList } from "@/components/faq-list";
import { getTranslations } from "next-intl/server";
import type { Faq } from "@/lib/site";
import { isWaitlistMode } from "@/lib/launch-mode";

export async function FaqSection({ faqs }: { faqs: Faq[] }) {
  const t = await getTranslations("Home.faq");
  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-20 border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2
          id="faq-heading"
          className="text-center text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
        >
          {t("heading")}
        </h2>
        <FaqList items={faqs} className="mt-10" />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t.rich("notHere", {
            link: (chunks) => (
              <Link href={isWaitlistMode() ? "#waitlist" : "/contact"} className="font-medium text-primary underline-offset-4 hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </section>
  );
}
