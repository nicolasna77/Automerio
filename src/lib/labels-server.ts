import { getLocale, getTranslations } from "next-intl/server";
import { createLabels, type LabelTranslator } from "@/lib/labels";

export async function getLabels() {
  const [t, locale] = await Promise.all([getTranslations("Labels"), getLocale()]);
  return createLabels(t as unknown as LabelTranslator, locale);
}
