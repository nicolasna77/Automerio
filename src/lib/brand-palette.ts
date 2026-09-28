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
    background: "#e0edf8",
    card: "#ffffff",
    foreground: "#09131a",
    mutedForeground: "#4c575f",
    border: "#d3e0ea",
    primary: "#00a33d",
    primaryForeground: "#f3faff",
  },
  dark: {
    background: "#02080e",
    foreground: "#e9f0f5",
    mutedForeground: "#85919a",
  },
} as const;

export const BRAND_GRADIENT_END = "#006322";
