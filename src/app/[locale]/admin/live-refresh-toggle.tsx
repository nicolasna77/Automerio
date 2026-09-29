"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { RadioIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const REFRESH_INTERVAL_MS = 20_000;

export function LiveRefreshToggle() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, router]);

  return (
    <Button
      type="button"
      variant={enabled ? "secondary" : "outline"}
      size="sm"
      aria-pressed={enabled}
      onClick={() => setEnabled((v) => !v)}
    >
      <RadioIcon
        aria-hidden="true"
        data-icon="inline-start"
        className={enabled ? "motion-safe:animate-pulse text-destructive" : undefined}
      />
      {enabled ? "Direct" : "En pause"}
    </Button>
  );
}
