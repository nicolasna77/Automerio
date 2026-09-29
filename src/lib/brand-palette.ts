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
    background: "#f1ede7",
    card: "#ffffff",
    foreground: "#1c1917",
    mutedForeground: "#57534e",
    border: "#e3ddd4",
    primary: "#15803d",
    primaryForeground: "#ffffff",
  },
  dark: {
    background: "#161311",
    foreground: "#f4f1ec",
    mutedForeground: "#a8a29e",
  },
} as const;
