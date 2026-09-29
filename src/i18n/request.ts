import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import * as rootParams from "next/root-params";
import { routing } from "./routing";

async function rootLocale(): Promise<string | undefined> {
  try {
    return await rootParams.locale();
  } catch {
    return undefined;
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  const candidate = (await rootLocale()) ?? (await requestLocale);
  const locale = hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;
  return {
    locale,
    timeZone: "Europe/Paris",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
