import { ArrowRight, Check, FileText, Headset, ListChecks, Phone, PhoneForwarded } from "lucide-react";
import { useTranslations } from "next-intl";
import { ServiceGlyph } from "@/components/service-glyph";
import { cn } from "@/lib/utils";

type Family = "call" | "booking-call" | "chat" | "email" | "calendar" | "document" | "meeting" | "support";

const FAMILY_BY_SLUG: Record<string, Family> = {
  "standard-telephonique-ia": "call",
  "prise-rdv-telephone": "booking-call",
  "assistant-whatsapp": "chat",
  "assistant-facebook": "chat",
  "assistant-instagram": "chat",
  "reponses-emails": "email",
  "prise-rdv-automatique": "calendar",
  "resume-pdf": "document",
  "ocr-lecture-automatique": "document",
  "resume-reunions": "meeting",
  "support-prioritaire": "support",
};

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative isolate mx-auto w-full max-w-md select-none",
        className
      )}
    >
      {children}
    </div>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-xs font-medium text-muted-foreground", className)}>
      {children}
    </span>
  );
}

function Bubble({ from, children }: { from: "them" | "us"; children: React.ReactNode }) {
  return (
    <div className={cn("flex", from === "us" ? "justify-end" : "justify-start")}>
      <p
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-[0.8125rem] leading-snug",
          from === "us"
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-muted text-foreground"
        )}
      >
        {children}
      </p>
    </div>
  );
}

function Waveform() {
  const bars = [4, 9, 14, 7, 18, 11, 5, 15, 9, 13, 6, 17, 10, 4, 12, 8, 16, 6, 11, 5];
  return (
    <div className="flex h-6 items-center gap-[3px]">
      {bars.map((height, index) => (
        <span
          key={index}
          className="w-[3px] rounded-full bg-primary/70"
          style={{ height: `${height + 4}px` }}
        />
      ))}
    </div>
  );
}

function CallIllustration({ booking }: { booking: boolean }) {
  const t = useTranslations("Illustrations.call");
  return (
    <Frame>
      <Panel>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Phone className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-medium text-foreground">{t("incoming")}</p>
              <p className="font-mono text-xs tabular-nums text-muted-foreground">06 •• •• 42 18</p>
            </div>
          </div>
          <Label>{t("answeredAt")}</Label>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2">
          <Waveform />
          <span className="font-mono text-xs tabular-nums text-muted-foreground">01:12</span>
        </div>
        <div className="mt-4 space-y-2">
          {booking ? (
            <>
              <Bubble from="them">{t("bookingThem1")}</Bubble>
              <Bubble from="us">{t("bookingUs")}</Bubble>
              <Bubble from="them">{t("bookingThem2")}</Bubble>
            </>
          ) : (
            <>
              <Bubble from="them">{t("leakThem")}</Bubble>
              <Bubble from="us">{t("leakUs")}</Bubble>
            </>
          )}
        </div>
      </Panel>

      <Panel className="relative -mt-3 ml-8 border-primary/30 sm:ml-16">
        <div className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" />
          </span>
          <p className="text-sm font-medium text-foreground">
            {booking ? t("booked") : t("summarySent")}
          </p>
        </div>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          {booking ? (
            <>
              <dt className="text-muted-foreground">{t("when")}</dt>
              <dd className="text-foreground">{t("whenValue")}</dd>
              <dt className="text-muted-foreground">{t("calendar")}</dt>
              <dd className="text-foreground">{t("calendarValue")}</dd>
            </>
          ) : (
            <>
              <dt className="text-muted-foreground">{t("reason")}</dt>
              <dd className="text-foreground">{t("reasonValue")}</dd>
              <dt className="text-muted-foreground">{t("next")}</dt>
              <dd className="text-foreground">{t("nextValue")}</dd>
            </>
          )}
        </dl>
      </Panel>
    </Frame>
  );
}

function ChatIllustration({ slug }: { slug: string }) {
  const t = useTranslations("Illustrations.chat");
  return (
    <Frame>
      <Panel className="p-0">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <ServiceGlyph slug={slug} className="size-6" />
          <div className="leading-tight">
            <p className="text-sm font-medium text-foreground">Camille R.</p>
            <Label>{t("online")}</Label>
          </div>
        </div>
        <div className="space-y-2 px-4 py-4">
          <Bubble from="them">{t("them1")}</Bubble>
          <Bubble from="us">{t("us1")}</Bubble>
          <Bubble from="them">{t("them2")}</Bubble>
          <Bubble from="us">{t("us2")}</Bubble>
        </div>
      </Panel>
      <div className="relative -mt-4 ml-auto flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
        <span className="size-1.5 rounded-full bg-primary" />
        <Label className="normal-case">{t("answered")}</Label>
      </div>
    </Frame>
  );
}

function EmailIllustration() {
  const t = useTranslations("Illustrations.email");
  return (
    <Frame>
      <Panel className="p-0">
        <div className="border-b border-border px-4 py-3">
          <Label>{t("inbox")}</Label>
        </div>
        {[
          { from: "M. Durand", subject: t("mail1Subject"), state: t("mail1State") },
          { from: "Sophie L.", subject: t("mail2Subject"), state: t("mail2State") },
          { from: t("mail3From"), subject: t("mail3Subject"), state: t("mail3State") },
        ].map((mail) => (
          <div key={mail.subject} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-foreground">{mail.from}</p>
              <p className="truncate text-xs text-muted-foreground">{mail.subject}</p>
            </div>
            <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {mail.state}
            </span>
          </div>
        ))}
      </Panel>
      <Panel className="relative -mt-3 ml-8 sm:ml-16">
        <Label>{t("draftLabel")}</Label>
        <p className="mt-2 text-[0.8125rem] leading-snug text-foreground">
          {t("draft")}
        </p>
      </Panel>
    </Frame>
  );
}

const CALENDAR_DAYS = ["mon", "tue", "wed", "thu", "fri"] as const;
const BOOKED_SLOTS: Record<(typeof CALENDAR_DAYS)[number], number[]> = {
  mon: [1],
  tue: [0, 2],
  wed: [1],
  thu: [0, 1],
  fri: [2],
};

function CalendarIllustration() {
  const t = useTranslations("Illustrations.calendar");
  return (
    <Frame>
      <Panel>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{t("week")}</p>
          <Label>{t("synced")}</Label>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {CALENDAR_DAYS.map((day) => (
            <div key={day} className="space-y-1.5">
              <Label className="block text-center">{t(`days.${day}`)}</Label>
              {[0, 1, 2].map((slot) => {
                const isBooked = BOOKED_SLOTS[day].includes(slot);
                const isNew = day === "thu" && slot === 1;
                return (
                  <div
                    key={slot}
                    className={cn(
                      "h-8 rounded-md border",
                      isNew
                        ? "border-primary bg-primary/80"
                        : isBooked
                          ? "border-primary/30 bg-primary/15"
                          : "border-dashed border-border"
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="relative -mt-3 ml-8 border-primary/30 sm:ml-16">
        <div className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" />
          </span>
          <p className="text-sm font-medium text-foreground">{t("newBooking")}</p>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{t("newBookingDetail")}</p>
      </Panel>
    </Frame>
  );
}

function DocumentIllustration({ meeting }: { meeting: boolean }) {
  const t = useTranslations("Illustrations.document");
  return (
    <Frame>
      <div className="grid grid-cols-[1fr_auto_1.15fr] items-center gap-3">
        <Panel className="space-y-2 p-3">
          <div className="flex items-center gap-1.5">
            <FileText className="size-4 text-muted-foreground" />
            <Label>{meeting ? t("meetingFile") : t("contractFile")}</Label>
          </div>
          {meeting ? (
            <div className="pt-1">
              <Waveform />
            </div>
          ) : (
            Array.from({ length: 9 }, (_, index) => (
              <span
                key={index}
                className="block h-1.5 rounded-full bg-muted"
                style={{ width: `${[100, 92, 97, 70, 100, 88, 95, 60, 80][index]}%` }}
              />
            ))
          )}
          <Label className="block pt-1">{meeting ? t("meetingLength") : t("contractLength")}</Label>
        </Panel>
        <span className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-primary">
          <ArrowRight className="size-4" />
        </span>
        <Panel className="border-primary/30 p-3">
          <div className="flex items-center gap-1.5">
            <ListChecks className="size-3.5 text-primary" />
            <Label className="text-primary">{t("summary")}</Label>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs leading-snug text-foreground">
            {(meeting
              ? [t("meeting1"), t("meeting2"), t("meeting3")]
              : [t("contract1"), t("contract2"), t("contract3")]
            ).map((line) => (
              <li key={line} className="flex gap-1.5">
                <Check className="mt-0.5 size-3 shrink-0 text-primary" />
                {line}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Frame>
  );
}

function SupportIllustration() {
  const t = useTranslations("Illustrations.support");
  return (
    <Frame>
      <Panel>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{t("request")}</p>
          <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {t("priority")}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          <Bubble from="them">{t("them")}</Bubble>
          <Bubble from="us">{t("us")}</Bubble>
        </div>
      </Panel>
      <div className="relative -mt-4 ml-auto flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
        <span className="size-1.5 rounded-full bg-primary" />
        <Label className="normal-case">{t("handled")}</Label>
      </div>
    </Frame>
  );
}

export function ServiceIllustration({ slug, className }: { slug: string; className?: string }) {
  const family = FAMILY_BY_SLUG[slug] ?? "support";
  return (
    <div className={className}>
      {family === "call" && <CallIllustration booking={false} />}
      {family === "booking-call" && <CallIllustration booking />}
      {family === "chat" && <ChatIllustration slug={slug} />}
      {family === "email" && <EmailIllustration />}
      {family === "calendar" && <CalendarIllustration />}
      {family === "document" && <DocumentIllustration meeting={false} />}
      {family === "meeting" && <DocumentIllustration meeting />}
      {family === "support" && <SupportIllustration />}
    </div>
  );
}

export function ForwardingDiagram({ vertical = false }: { vertical?: boolean }) {
  const t = useTranslations("Illustrations.forwarding");
  const steps = [
    { icon: Phone, label: t("caller"), detail: t("callerDetail") },
    { icon: PhoneForwarded, label: t("forward"), detail: t("forwardDetail") },
    { icon: Headset, label: t("assistant"), detail: t("assistantDetail") },
  ];
  return (
    <div
      aria-hidden="true"
      className={cn("flex flex-col items-stretch gap-2", !vertical && "sm:flex-row sm:items-center")}
    >
      {steps.map((step, index) => (
        <div
          key={step.label}
          className={cn("flex flex-1 flex-col items-stretch gap-2", !vertical && "sm:flex-row sm:items-center")}
        >
          <div
            className={cn(
              "flex flex-1 items-center gap-3 rounded-2xl border bg-card px-4 py-3",
              index === steps.length - 1 ? "border-primary/40" : "border-border"
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                index === steps.length - 1 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              )}
            >
              <step.icon className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-medium text-foreground">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.detail}</p>
            </div>
          </div>
          {index < steps.length - 1 && (
            <span className="flex justify-center text-muted-foreground">
              <ArrowRight className={cn("size-4 rotate-90", !vertical && "sm:rotate-0")} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function ConfigPreview({ labels }: { labels: string[] }) {
  return (
    <div aria-hidden="true" className="space-y-3">
      {labels.map((label) => (
        <div key={label}>
          <p className="text-xs font-medium text-foreground">{label}</p>
          <span className="mt-1.5 block h-8 rounded-lg border border-dashed border-border bg-card" />
        </div>
      ))}
    </div>
  );
}

export function SetupPreview() {
  const t = useTranslations("Illustrations.setup");
  return (
    <ul aria-hidden="true" className="space-y-2">
      {[t("tools"), t("tests"), t("live")].map((item, index) => (
        <li key={item} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full",
              index < 2 ? "bg-primary text-primary-foreground" : "border border-primary/40 text-primary"
            )}
          >
            <Check className="size-3" />
          </span>
          <span className="text-sm text-foreground">{item}</span>
        </li>
      ))}
    </ul>
  );
}

const ACTIVITY_LINES = ["a", "b", "c"] as const;

export function ActivityPreview({ slug }: { slug: string }) {
  const t = useTranslations("Illustrations.activity");
  const family = FAMILY_BY_SLUG[slug] ?? "support";
  const lines = ACTIVITY_LINES.map((line) => t(`lines.${family}.${line}`));
  return (
    <div aria-hidden="true" className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <Label>{t("today")}</Label>
        <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          {t("active")}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {lines.map((line) => (
          <li key={line} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground">
            <Check className="size-3.5 shrink-0 text-primary" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
