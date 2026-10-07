"use client";

import { useTranslations } from "next-intl";
import { PageTabs } from "@/components/page-tabs";
import { CATALOGUE_PATH, MY_SOLUTIONS_PATH } from "./paths";

export function SolutionsTabs({ myCount }: { myCount: number }) {
  const t = useTranslations("Dashboard.services.tabs");
  return (
    <PageTabs
      label={t("label")}
      tabs={[
        { href: MY_SOLUTIONS_PATH, label: t("mine"), count: myCount },
        { href: CATALOGUE_PATH, label: t("catalog") },
      ]}
    />
  );
}
