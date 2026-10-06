"use client";

import { WorkspaceError } from "@/components/workspace-error";

export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <WorkspaceError {...props} />;
}
