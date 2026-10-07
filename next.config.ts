import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const LEGACY_PATHS: [string, string][] = [
  ["/prestations", "/services"],
  ["/confidentialite", "/privacy"],
  ["/mentions-legales", "/legal-notice"],
  ["/cgv", "/terms"],
  ["/dashboard/prestations/activer", "/dashboard/services/activate"],
  ["/dashboard/prestations/catalogue", "/dashboard/services/catalog"],
  ["/dashboard/prestations", "/dashboard/services"],
  ["/dashboard/abonnements", "/dashboard/subscriptions"],
  ["/dashboard/aide", "/dashboard/help"],
  ["/dashboard/calendrier", "/dashboard/calendar"],
  ["/dashboard/organisation", "/dashboard/organization"],
  ["/dashboard/paiements", "/dashboard/payments"],
  ["/admin/export/demandes-aide", "/admin/export/help-requests"],
  ["/admin/aide", "/admin/help"],
  ["/admin/calendrier", "/admin/calendar"],
  ["/admin/codes-promo", "/admin/promo-codes"],
  ["/admin/journal", "/admin/audit-log"],
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return LEGACY_PATHS.flatMap(([source, destination]) => [
      { source, destination, permanent: true },
      { source: `${source}/:path*`, destination: `${destination}/:path*`, permanent: true },
    ]);
  },
  experimental: {
    // Limite globale (Next ne permet pas de la fixer action par action) : la seule
    // Server Action qui reçoit un gros corps est l'import de carte
    // (`transcribeMenu`, src/app/[locale]/dashboard/menu-import-actions.ts),
    // plafonnée à MENU_IMPORT_MAX_TOTAL_BYTES = 12 Mo (src/lib/menu-import.ts).
    // 13 Mo = ces 12 Mo + la marge de l'enveloppe multipart. À ajuster avec ce
    // plafond ; l'avatar passe par l'API better-auth, pas par une Server Action.
    serverActions: { bodySizeLimit: "13mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default withNextIntl(nextConfig);
