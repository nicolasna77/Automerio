"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";

// Contenu commun des pages d'erreur : le titre reçoit le focus pour que le
// lecteur d'écran annonce l'erreur, la référence aide l'équipe à la retrouver
// dans les journaux, « Réessayer » relance le rendu du segment.
export function ErrorPanel({
  error,
  reset,
  namespace,
  link,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  namespace: "Errors.generic" | "Errors.workspace";
  link?: { href: string; label: string };
}) {
  const t = useTranslations(namespace);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error(error);
    headingRef.current?.focus();
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
      <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-semibold tracking-tight text-foreground outline-none sm:text-3xl">
        {t("heading")}
      </h1>
      <p className="mt-3 text-muted-foreground">{t("lead")}</p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("reference", { digest: error.digest })}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()}>{t("retry")}</Button>
        {link && (
          <Link href={link.href} className={buttonVariants({ variant: "outline" })}>
            {link.label}
          </Link>
        )}
      </div>
    </div>
  );
}
