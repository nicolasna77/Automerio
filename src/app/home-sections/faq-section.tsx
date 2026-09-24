import Link from "next/link";
import { FaqList } from "@/components/faq-list";
import { FAQS } from "@/lib/site";

export function FaqSection() {
  return (
    <section aria-labelledby="faq-heading" className="border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2
          id="faq-heading"
          className="text-center text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
        >
          Ce que nos clients demandent avant de se lancer
        </h2>
        <FaqList items={FAQS} className="mt-10" />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Votre question n&apos;est pas là ?{" "}
          <Link href="/contact" className="font-medium text-primary underline-offset-4 hover:underline">
            Écrivez-nous
          </Link>
          , on répond sous 24h ouvrées.
        </p>
      </div>
    </section>
  );
}
