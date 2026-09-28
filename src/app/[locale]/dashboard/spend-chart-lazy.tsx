"use client";

import dynamic from "next/dynamic";
import { SpendChartSkeleton } from "./overview-skeletons";

export const SpendChartLazy = dynamic(
  () => import("./spend-chart-view").then((module) => module.SpendChartView),
  { ssr: false, loading: () => <SpendChartSkeleton /> }
);
