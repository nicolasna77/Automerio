"use client";

import { useTranslations } from "next-intl";
import { AutomerioLogo } from "@/components/brand";
import { ErrorPanel } from "@/components/error-panel";

export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors.generic");
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <AutomerioLogo />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center">
        <ErrorPanel {...props} namespace="Errors.generic" link={{ href: "/", label: t("home") }} />
      </main>
    </div>
  );
}
