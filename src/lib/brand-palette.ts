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
    background: "#f1f3f3",
    card: "#ffffff",
    foreground: "#090b0c",
    mutedForeground: "#5c6c70",
    border: "#e3e7e8",
    primary: "#008236",
    primaryForeground: "#f0fdf4",
  },
  dark: {
    background: "#090b0c",
    foreground: "#f9fbfb",
    mutedForeground: "#9ca8ab",
  },
} as const;

/**
 * Le vert sombre qui ferme le degrade du logo sur les images de partage.
 * Choisi a la main : aucun jeton ne le porte, le test ne le controle donc pas.
 */
export const BRAND_GRADIENT_END = "#004e1d";
