"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { RadioIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pollWhileVisible } from "@/lib/poll-while-visible";

const REFRESH_INTERVAL_MS = 20_000;

export function LiveRefreshToggle() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    return pollWhileVisible(() => router.refresh(), REFRESH_INTERVAL_MS);
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
        className={enabled ? "text-destructive" : undefined}
      />
      {enabled ? "Direct" : "En pause"}
    </Button>
  );
}
