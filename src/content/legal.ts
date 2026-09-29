import type { ComponentType } from "react";
import * as legalNotice from "./fr/legal/legal-notice";
import * as terms from "./fr/legal/terms";
import * as privacy from "./fr/legal/privacy";
import * as cookies from "./fr/legal/cookies";

const FR = { ...legalNotice, ...terms, ...privacy, ...cookies };

type LegalContent = { [K in keyof typeof FR]: ComponentType };

const BY_LOCALE: Record<string, LegalContent> = { fr: FR };

export function legalContent(locale: string): LegalContent {
  return BY_LOCALE[locale] ?? FR;
}
