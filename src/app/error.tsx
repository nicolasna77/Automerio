"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { AutomerioLogo } from "@/components/brand";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <AutomerioLogo />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Une erreur est survenue
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Quelque chose s&apos;est mal passé de notre côté. Vous pouvez
          réessayer, ou revenir à l&apos;accueil.
        </p>
        <div className="mt-8 flex gap-3">
          <Button variant="outline" onClick={() => reset()}>
            Réessayer
          </Button>
          <Link href="/" className={buttonVariants()}>
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
    </div>
  );
}
