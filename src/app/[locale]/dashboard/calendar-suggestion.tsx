"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plug, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { calendarSuggestionCookie, DISMISSAL_MAX_AGE_SECONDS } from "@/lib/dismissals";

// Suggestion facultative de connecter un agenda : le client peut la refermer,
// et elle ne revient pas (cookie lu par la page). Le réglage reste accessible
// dans l'onglet Connecteurs.
export function CalendarSuggestion({
  clientServiceId,
  connectorsHref,
}: {
  clientServiceId: string;
  connectorsHref: string;
}) {
  const t = useTranslations("Dashboard.service.calendarSuggestion");
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  function dismiss() {
    document.cookie = `${calendarSuggestionCookie(clientServiceId)}=1; path=/; max-age=${DISMISSAL_MAX_AGE_SECONDS}; samesite=lax`;
    setDismissed(true);
  }

  return (
    <Alert className="mt-6 pr-12">
      <Plug aria-hidden="true" />
      <AlertTitle>{t("title")}</AlertTitle>
      <AlertDescription>
        <p>{t("description")}</p>
        <Link href={connectorsHref} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3" })}>
          {t("cta")}
        </Link>
      </AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="icon-sm" onClick={dismiss} aria-label={t("dismiss")}>
          <X aria-hidden="true" />
        </Button>
      </AlertAction>
    </Alert>
  );
}
