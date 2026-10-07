import { CalendarCheck, PhoneCall, Send } from "lucide-react";
import { useTranslations } from "next-intl";

const CAPABILITIES = [
  { icon: PhoneCall, key: "phone" },
  { icon: CalendarCheck, key: "booking" },
  { icon: Send, key: "summary" },
] as const;

export function AuthAside() {
  const t = useTranslations("Auth.aside");
  return (
    <aside className="relative isolate hidden overflow-hidden border-l border-border lg:flex lg:flex-col lg:justify-center lg:px-12 xl:px-16">
      <div aria-hidden="true" className="absolute inset-0 -z-20 overflow-hidden">
        <div className="absolute top-[18%] -left-1/4 w-[160%] origin-center rotate-[-38deg]">
          <div className="h-24 bg-primary/8 dark:bg-primary/25" />
          <div className="mt-10 h-9 bg-primary/5 dark:bg-primary/15" />
        </div>
      </div>
      <p className="max-w-sm tracking-tight text-balance text-foreground">
        <span className="block text-xl font-medium leading-snug">
          {t("line1")}
        </span>
        <span className="mt-1.5 block text-3xl font-semibold leading-tight tracking-tight">
          {t("line2")}
        </span>
      </p>

      <ul className="mt-9 max-w-sm space-y-3.5">
        {CAPABILITIES.map(({ icon: Icon, key }) => (
          <li key={key} className="flex items-start gap-3 text-sm text-muted-foreground">
            <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {t(`capabilities.${key}`)}
          </li>
        ))}
      </ul>

      <p className="mt-9 max-w-sm border-t border-border pt-5 text-sm leading-relaxed text-balance text-muted-foreground">
        {t("guarantee")}
      </p>
    </aside>
  );
}
