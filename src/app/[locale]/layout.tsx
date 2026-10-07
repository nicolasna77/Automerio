import type { Metadata } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { NextIntlClientProvider } from "next-intl";
import { locale as rootLocale } from "next/root-params";
import { routing } from "@/i18n/routing";
import { Toaster } from "@/components/ui/sonner";
import "../globals.css";
import { cn } from "@/lib/utils";
import { JsonLd, organizationSchema } from "@/components/json-ld";
import { getTranslations } from "next-intl/server";
import { siteUrl } from "@/lib/site";
import { siteOpenGraph } from "@/lib/site-metadata";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// DM Sans pour le texte et les titres, DM Mono (même famille) pour les
// données : prix, horaires, numéros (DESIGN.md, Typographie).
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Site");
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("title"), template: "%s | Automerio" },
    description: t("description"),
    openGraph: await siteOpenGraph(),
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, t] = await Promise.all([rootLocale(), getTranslations("Site")]);
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        dmSans.variable,
        dmMono.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationSchema(t("description"))} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            {children}
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
