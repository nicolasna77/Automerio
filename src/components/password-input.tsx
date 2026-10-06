"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

export function PasswordInput({
  className,
  describedBy,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { describedBy?: string }) {
  const t = useTranslations("Common");
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const capsId = useId();

  function trackCapsLock(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          {...props}
          type={visible ? "text" : "password"}
          className={cn("pr-11", className)}
          aria-describedby={
            [describedBy, capsLock ? capsId : null].filter(Boolean).join(" ") || undefined
          }
          onKeyDown={trackCapsLock}
          onKeyUp={trackCapsLock}
          onBlur={(event) => {
            setCapsLock(false);
            props.onBlur?.(event);
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-pressed={visible}
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-3xl text-muted-foreground transition-colors hover:text-foreground focus-visible:focus-ring"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {capsLock && (
        <p id={capsId} className="text-xs text-muted-foreground">
          {t("capsLock")}
        </p>
      )}
    </div>
  );
}
