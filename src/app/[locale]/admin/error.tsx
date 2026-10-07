"use client";

import { ErrorPanel } from "@/components/error-panel";

export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPanel {...props} namespace="Errors.workspace" />;
}
