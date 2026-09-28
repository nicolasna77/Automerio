import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main
        id="content"
        className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center"
      >
        <p className="text-sm tracking-widest text-primary uppercase">
          Erreur 404
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Cette page n&apos;existe pas
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Le lien est peut-être obsolète, ou l&apos;adresse mal orthographiée.
        </p>
        <Link href="/" className={cn(buttonVariants(), "mt-8")}>
          <ArrowLeft data-icon="inline-start" />
          Retour à l&apos;accueil
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
