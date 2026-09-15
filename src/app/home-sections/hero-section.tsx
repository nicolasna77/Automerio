import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatCents, type ServiceDTO } from "@/lib/catalog";
import { HeroNetworkVisual } from "./hero-network-visual";

const VISUAL_NODE_COUNT = 6;

export function HeroSection({ services }: { services: ServiceDTO[] }) {
  const communication = services.filter((s) => s.category === "COMMUNICATION");
  const labels = communication.slice(0, VISUAL_NODE_COUNT).map((s) => s.name);

  const monthlyPrices = communication
    .filter((s) => s.monthlyPriceCents !== null)
    .map((s) => s.monthlyPriceCents as number);
  const fromPrice = monthlyPrices.length > 0 ? Math.min(...monthlyPrices) : null;

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      <div aria-hidden="true" className="absolute inset-0 -z-20 overflow-hidden">
        <div className="absolute top-[12%] -left-1/2 w-[150%] origin-center rotate-[-38deg]">
          <div className="h-24 bg-primary/8 dark:bg-primary/25" />
          <div className="mt-10 h-9 bg-primary/5 dark:bg-primary/15" />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[url(/dot-grid.svg)] bg-size-[1440px_1056px] bg-top opacity-60 mask-[linear-gradient(to_bottom,transparent_58%,black_80%)] lg:mask-[linear-gradient(to_right,transparent_30%,black_65%)] dark:opacity-70 dark:invert"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1fr)_32rem]">
        <div>
          <p className="mb-6 text-sm text-muted-foreground">
            Agence d&apos;automatisation IA pour artisans, coachs et TPE/PME
          </p>
          <h1 className="max-w-2xl tracking-tight text-balance text-foreground">
            <span className="block text-2xl font-medium leading-snug sm:text-3xl">
              Votre entreprise tourne.
            </span>
            <span className="mt-2 block text-[2.6rem] font-bold leading-[0.98] tracking-[-0.03em] [font-stretch:88%] sm:text-6xl">
              Vos automatisations s&apos;occupent du reste.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-balance text-muted-foreground">
            Un assistant IA répond au téléphone et sur vos messageries, prend
            les rendez-vous et vous transmet l&apos;essentiel. Notre équipe
            l&apos;installe, le connecte à vos outils et le surveille chaque
            mois.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Créer mon compte
              <ArrowRight data-icon="inline-end" />
            </Link>
            <Link
              href="#prestations"
              className={buttonVariants({ size: "lg", variant: "secondary" })}
            >
              Voir les solutions
            </Link>
          </div>
          <p className="mt-4 max-w-md text-sm text-balance text-muted-foreground">
            {fromPrice !== null && (
              <>
                À partir de{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatCents(fromPrice)} TTC par mois
                </span>
                , sans engagement.{" "}
              </>
            )}
            Remboursé si ça ne vous convient pas sous 30 jours.
          </p>
        </div>
        <HeroNetworkVisual labels={labels} />
      </div>
    </section>
  );
}
