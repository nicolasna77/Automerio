"use client";

import { WorkspaceError } from "@/components/workspace-error";

export default function DashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <WorkspaceError {...props} helpHref="/dashboard/help" />;
}
