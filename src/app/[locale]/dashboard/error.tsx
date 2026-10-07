"use client";

import { useTranslations } from "next-intl";
import { ErrorPanel } from "@/components/error-panel";

export default function DashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors.workspace");
  return <ErrorPanel {...props} namespace="Errors.workspace" link={{ href: "/dashboard/help", label: t("help") }} />;
}
