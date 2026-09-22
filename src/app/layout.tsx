import type { Metadata } from "next";
import { PT_Serif, Space_Grotesk, Space_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { cn } from "@/lib/utils";
import { JsonLd, organizationSchema } from "@/components/json-ld";
import { SITE_DESCRIPTION, SITE_TITLE, siteOpenGraph, siteUrl } from "@/lib/site";
import { Analytics } from "@vercel/analytics/next";

// Les variables portent le nom de la police, non celui de son role. Le theme
// compose ensuite les piles par-dessus (`globals.css`). Sans cette separation,
// la classe posee par next/font et la regle `:root` du theme se disputeraient
// le meme nom, et le gagnant dependrait de l'ordre des feuilles de style.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

// PT Serif et Space Mono n'ont pas de fonte variable : leurs graisses se
// declarent une par une.
const ptSerif = PT_Serif({
  variable: "--font-pt-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Ni `alternates.canonical` ni `openGraph.url` ne figurent ici : Next fait
// heriter tout champ qu'une page ne redefinit pas, si bien qu'une URL posee au
// niveau du layout se propage a tout le site et que chaque page se declare
// canonique vers l'accueil. Chaque page publique pose donc la sienne.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE_TITLE, template: "%s | Automerio" },
  description: SITE_DESCRIPTION,
  openGraph: siteOpenGraph(),
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        spaceGrotesk.variable,
        ptSerif.variable,
        spaceMono.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationSchema()} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
