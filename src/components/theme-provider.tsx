"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// next-themes rend un <script> qui applique le thème avant l'hydratation.
// Quand React le recrée côté client (changement de langue, remontage du
// layout), React 19 avertit qu'un script ne s'exécute jamais dans le
// navigateur. Le type « application/json » côté client en fait un bloc de
// données que React ignore ; le HTML du serveur garde un script exécutable.
const scriptProps =
  typeof window === "undefined" ? undefined : { type: "application/json" };

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider scriptProps={scriptProps} {...props} />;
}
