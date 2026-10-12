import { getTranslations } from "next-intl/server";
import { TESTIMONIALS } from "@/content/fr/testimonials";

// Avis réels uniquement (src/content/fr/testimonials.ts) : sans avis, rien ne
// s'affiche plutôt qu'une section vide ou des exemples.
export async function TestimonialsSection() {
  if (TESTIMONIALS.length === 0) return null;
  const t = await getTranslations("Home.testimonials");
  return (
    <section aria-labelledby="testimonials-heading" className="border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2
          id="testimonials-heading"
          className="max-w-2xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
        >
          {t("heading")}
        </h2>
        <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <li key={testimonial.name}>
              <figure className="flex h-full flex-col rounded-lg border border-border bg-card p-6">
                <blockquote className="text-lg leading-relaxed text-foreground">
                  <p>« {testimonial.quote} »</p>
                </blockquote>
                <figcaption className="mt-auto pt-5 text-sm">
                  <span className="block font-semibold text-foreground">{testimonial.name}</span>
                  <span className="text-muted-foreground">
                    {t("role", { role: testimonial.role, company: testimonial.company })}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
