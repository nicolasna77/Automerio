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
    background: "#eef0f3",
    card: "#ffffff",
    foreground: "#111418",
    mutedForeground: "#4a5160",
    border: "#dfe3e8",
    primary: "#15803d",
    primaryForeground: "#ffffff",
  },
  dark: {
    background: "#0e1013",
    foreground: "#eef0f3",
    mutedForeground: "#9aa1ab",
  },
} as const;
