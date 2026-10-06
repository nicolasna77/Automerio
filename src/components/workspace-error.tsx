"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";

// Erreur d'une page du tableau de bord ou de l'admin : rendue dans la mise en
// page, la barre latérale reste en place et l'utilisateur peut réessayer ou
// aller ailleurs sans recharger toute l'application.
export function WorkspaceError({
  error,
  reset,
  helpHref,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  helpHref?: string;
}) {
  const t = useTranslations("Errors.workspace");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error(error);
    headingRef.current?.focus();
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
      <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-semibold tracking-tight text-foreground outline-none">
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
        {helpHref && (
          <Link href={helpHref} className={buttonVariants({ variant: "outline" })}>
            {t("help")}
          </Link>
        )}
      </div>
    </div>
  );
}
