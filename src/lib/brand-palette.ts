/**
 * La palette en hexadecimal, pour les rendus qui n'ont pas la cascade CSS :
 * un client de messagerie ignore les variables, et Satori, qui fabrique les
 * images de partage, n'a pas de `:root`. Chaque valeur est la conversion en
 * sRGB d'un jeton de `src/app/globals.css` — le theme clair pour les e-mails,
 * le theme sombre pour les images.
 *
 * `PALETTE_TOKENS` dit de quel jeton chaque valeur descend, et
 * `brand-palette.test.ts` refait la conversion : une couleur du theme qui
 * bouge sans que cette table suive fait echouer les tests. C'est deja arrive
 * a `mutedForeground`, reste en #67787c apres un changement de theme.
 */
export const PALETTE_TOKENS = {
  light: {
    background: "--muted",
    card: "--card",
    foreground: "--card-foreground",
    mutedForeground: "--muted-foreground",
    border: "--border",
    primary: "--primary",
    primaryForeground: "--primary-foreground",
  },
  dark: {
    background: "--background",
    foreground: "--foreground",
    mutedForeground: "--muted-foreground",
  },
} as const;

export const BRAND_PALETTE = {
  light: {
    background: "#f1f5f9",
    card: "#ffffff",
    foreground: "#0d1b2e",
    mutedForeground: "#4a5568",
    border: "#cbd5e0",
    primary: "#2c7a7b",
    primaryForeground: "#f6f7f8",
  },
  dark: {
    background: "#0d1b2e",
    foreground: "#f6f7f8",
    mutedForeground: "#a0aec0",
  },
} as const;

/**
 * La teinte foncee qui ferme le degrade du logo sur les images de partage.
 * Aucun jeton ne la porte, le test ne la controle donc pas : elle reprend le
 * calcul que `brand.tsx` fait en CSS — `color-mix(in oklab, var(--primary)
 * 70%, black)` — pour que l'image de partage et le logo affiche ne divergent
 * pas.
 */
export const BRAND_GRADIENT_END = "#17494a";
