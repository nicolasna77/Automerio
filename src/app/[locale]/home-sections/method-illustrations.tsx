import { CalendarCheck, Check, Mail, MessageCircle, PhoneForwarded, SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="relative isolate flex min-h-72 items-center justify-center overflow-hidden rounded-3xl border border-border bg-muted/40 p-6 select-none sm:p-10"
    >
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-xs font-medium text-muted-foreground", className)}>
      {children}
    </span>
  );
}

export async function BriefIllustration() {
  const t = await getTranslations("Home.method.illustrations.brief");
  const fields = [
    { label: t("activity"), value: t("activityValue") },
    { label: t("hours"), value: t("hoursValue") },
    { label: t("emergency"), value: t("emergencyValue") },
  ];
  return (
    <Stage>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <Tag>{t("title")}</Tag>
          <span className="text-xs font-medium text-primary">3 / 3</span>
        </div>
        <div className="mt-4 space-y-3.5">
          {fields.map((field) => (
            <div key={field.label}>
              <p className="text-xs font-medium text-foreground">{field.label}</p>
              <p className="mt-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                {field.value}
              </p>
            </div>
          ))}
        </div>
        <span className="mt-5 flex h-9 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground">
          {t("send")}
        </span>
      </div>
    </Stage>
  );
}

export async function SetupIllustration() {
  const t = await getTranslations("Home.method.illustrations.setup");
  const steps = [
    { icon: PhoneForwarded, label: t("number"), done: true },
    { icon: MessageCircle, label: t("messaging"), done: true },
    { icon: CalendarCheck, label: t("calendar"), done: true },
    { icon: SlidersHorizontal, label: t("tested"), done: true },
  ];
  return (
    <Stage>
      <div className="relative">
        <ul className="space-y-2.5">
          {steps.map((step) => (
            <li
              key={step.label}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
            >
              <step.icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground">{step.label}</span>
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 ml-auto w-[85%] rounded-2xl border border-primary/40 bg-card p-4 shadow-md">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-primary" />
            <Tag>{t("newEmail")}</Tag>
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{t("activeTitle")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("activeBody")}
          </p>
        </div>
      </div>
    </Stage>
  );
}
