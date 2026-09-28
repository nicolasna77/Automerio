import type { Metadata } from "next";
import type { Messages } from "next-intl";
import { getTranslations } from "next-intl/server";

type PageTitleKey = keyof Messages["PageTitles"];

export function titleMetadata(key: PageTitleKey) {
  return async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("PageTitles");
    return { title: t(key) };
  };
}
