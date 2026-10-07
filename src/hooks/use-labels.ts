import { useLocale, useTranslations } from "next-intl";
import { createLabels, type LabelTranslator } from "@/lib/labels";

export function useLabels() {
  const t = useTranslations("Labels");
  const locale = useLocale();
  return createLabels(t as unknown as LabelTranslator, locale);
}
