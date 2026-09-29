import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageTitles");
  return { title: t("notFound") };
}

export default function NotFound() {
  const t = useTranslations("Errors.notFound");
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main
        id="content"
        className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center"
      >
        <p className="text-sm font-medium text-primary">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("heading")}
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          {t("lead")}
        </p>
        <Link href="/" className={cn(buttonVariants(), "mt-8")}>
          <ArrowLeft data-icon="inline-start" />
          {t("home")}
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
