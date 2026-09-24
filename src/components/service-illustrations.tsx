import { ArrowRight, Check, FileText, Headset, ListChecks, Phone, PhoneForwarded } from "lucide-react";
import { ServiceGlyph } from "@/components/service-glyph";
import { cn } from "@/lib/utils";

/**
 * Les illustrations des pages de solution.
 *
 * Plutot qu'un dessin decoratif, chacune montre le resultat concret : l'appel
 * decroche et son resume, le message repondu, le document condense. Elles
 * sont construites avec les jetons du theme — elles suivent le mode sombre —
 * et restent decoratives : tout ce qu'elles montrent est dit dans le texte de
 * la page, d'ou `aria-hidden`.
 *
 * Leurs textes evitent volontairement les prix et les mots des titres de la
 * page, qu'un lecteur d'ecran ou un test retrouverait en double.
 */

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
        "before:absolute before:-inset-6 before:-z-10 before:rounded-[2.5rem] before:bg-[radial-gradient(var(--border)_1px,transparent_1px)] before:[background-size:16px_16px] before:[mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_75%)]",
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
    <span className={cn("font-mono text-[0.6875rem] tracking-wide text-muted-foreground uppercase", className)}>
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
  return (
    <Frame>
      <Panel>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Phone className="size-4" />
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 motion-reduce:hidden" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-medium text-foreground">Appel entrant</p>
              <p className="font-mono text-xs text-muted-foreground">06 •• •• 42 18</p>
            </div>
          </div>
          <Label>12:47 · décroché</Label>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2">
          <Waveform />
          <span className="font-mono text-xs text-muted-foreground">01:12</span>
        </div>
        <div className="mt-4 space-y-2">
          {booking ? (
            <>
              <Bubble from="them">Bonjour, je voudrais un rendez-vous jeudi matin.</Bubble>
              <Bubble from="us">Jeudi, j&apos;ai 9 h 30 ou 10 h 30. Lequel vous convient ?</Bubble>
              <Bubble from="them">10 h 30, parfait.</Bubble>
            </>
          ) : (
            <>
              <Bubble from="them">Bonjour, j&apos;ai une fuite sous l&apos;évier, vous intervenez aujourd&apos;hui ?</Bubble>
              <Bubble from="us">Je note votre adresse et je préviens le technicien tout de suite.</Bubble>
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
            {booking ? "Rendez-vous ajouté à l'agenda" : "Résumé envoyé"}
          </p>
        </div>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          {booking ? (
            <>
              <dt className="text-muted-foreground">Quand</dt>
              <dd className="text-foreground">Jeudi · 10 h 30</dd>
              <dt className="text-muted-foreground">Agenda</dt>
              <dd className="text-foreground">Créneau inscrit automatiquement</dd>
            </>
          ) : (
            <>
              <dt className="text-muted-foreground">Motif</dt>
              <dd className="text-foreground">Fuite · urgent</dd>
              <dt className="text-muted-foreground">Suite</dt>
              <dd className="text-foreground">Appel transféré au technicien</dd>
            </>
          )}
        </dl>
      </Panel>
    </Frame>
  );
}

function ChatIllustration({ slug }: { slug: string }) {
  return (
    <Frame>
      <Panel className="p-0">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <ServiceGlyph slug={slug} className="size-6" />
          <div className="leading-tight">
            <p className="text-sm font-medium text-foreground">Camille R.</p>
            <Label>en ligne</Label>
          </div>
        </div>
        <div className="space-y-2 px-4 py-4">
          <Bubble from="them">Bonsoir, vous faites les devis pour une salle de bain ?</Bubble>
          <Bubble from="us">Bonsoir Camille, oui, le devis est gratuit. Nous avons un créneau de visite mardi ou jeudi : lequel vous arrange ?</Bubble>
          <Bubble from="them">Jeudi, en fin de journée.</Bubble>
          <Bubble from="us">C&apos;est noté pour jeudi. L&apos;équipe vous confirme l&apos;heure demain matin.</Bubble>
        </div>
      </Panel>
      <div className="relative -mt-4 ml-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm">
        <span className="size-1.5 rounded-full bg-primary" />
        <Label className="normal-case">Répondu en 4 s, à 22 h 14</Label>
      </div>
    </Frame>
  );
}

function EmailIllustration() {
  return (
    <Frame>
      <Panel className="p-0">
        <div className="border-b border-border px-4 py-3">
          <Label>Boîte de réception</Label>
        </div>
        {[
          { from: "M. Durand", subject: "Demande de devis cuisine", state: "Prioritaire" },
          { from: "Sophie L.", subject: "Horaires samedi ?", state: "Brouillon prêt" },
          { from: "Fournisseur Bois", subject: "Facture n° 2291", state: "Classé" },
        ].map((mail) => (
          <div key={mail.subject} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-foreground">{mail.from}</p>
              <p className="truncate text-xs text-muted-foreground">{mail.subject}</p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[0.6875rem] text-primary">
              {mail.state}
            </span>
          </div>
        ))}
      </Panel>
      <Panel className="relative -mt-3 ml-8 sm:ml-16">
        <Label>Brouillon prêt · à relire</Label>
        <p className="mt-2 text-[0.8125rem] leading-snug text-foreground">
          Bonjour M. Durand, merci pour votre demande. Pour préparer le devis, pourriez-vous
          nous indiquer les dimensions de la pièce ?
        </p>
      </Panel>
    </Frame>
  );
}

function CalendarIllustration() {
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
  const booked: Record<string, number[]> = { Lun: [1], Mar: [0, 2], Mer: [1], Jeu: [0, 1], Ven: [2] };
  return (
    <Frame>
      <Panel>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Semaine 39</p>
          <Label>synchronisé</Label>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {days.map((day) => (
            <div key={day} className="space-y-1.5">
              <Label className="block text-center">{day}</Label>
              {[0, 1, 2].map((slot) => {
                const isBooked = booked[day]?.includes(slot);
                const isNew = day === "Jeu" && slot === 1;
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
          <p className="text-sm font-medium text-foreground">Nouveau rendez-vous</p>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">Jeudi 10 h 30 · réservé en ligne par votre client, inscrit dans votre agenda</p>
      </Panel>
    </Frame>
  );
}

function DocumentIllustration({ meeting }: { meeting: boolean }) {
  return (
    <Frame>
      <div className="grid grid-cols-[1fr_auto_1.15fr] items-center gap-3">
        <Panel className="space-y-2 p-3">
          <div className="flex items-center gap-1.5">
            <FileText className="size-4 text-muted-foreground" />
            <Label>{meeting ? "réunion.m4a" : "contrat.pdf"}</Label>
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
          <Label className="block pt-1">{meeting ? "47 min" : "18 pages"}</Label>
        </Panel>
        <span className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-primary">
          <ArrowRight className="size-4" />
        </span>
        <Panel className="border-primary/30 p-3">
          <div className="flex items-center gap-1.5">
            <ListChecks className="size-3.5 text-primary" />
            <Label className="text-primary">Synthèse</Label>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs leading-snug text-foreground">
            {(meeting
              ? ["Lancement validé pour le 14", "Budget : +10 % accordé", "Julie envoie le planning"]
              : ["Durée : 24 mois", "Résiliation : préavis 3 mois", "Pénalité de retard : 1 %/mois"]
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
  return (
    <Frame>
      <Panel>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Demande n° 184</p>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[0.6875rem] text-primary">
            prioritaire
          </span>
        </div>
        <div className="mt-4 space-y-2">
          <Bubble from="them">Pouvez-vous ajouter nos nouveaux horaires d&apos;été ?</Bubble>
          <Bubble from="us">C&apos;est fait, ils s&apos;appliquent dès ce soir.</Bubble>
        </div>
      </Panel>
      <div className="relative -mt-4 ml-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm">
        <span className="size-1.5 rounded-full bg-primary" />
        <Label className="normal-case">Pris en charge en priorité</Label>
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

/**
 * Le renvoi d'appel, en schema : le client compose le numero habituel, le
 * renvoi l'amene a l'assistant, qui repond ou vous transfere.
 */
export function ForwardingDiagram({ vertical = false }: { vertical?: boolean }) {
  const steps = [
    { icon: Phone, label: "Votre client", detail: "compose votre numéro" },
    { icon: PhoneForwarded, label: "Renvoi d'appel", detail: "depuis votre ligne" },
    { icon: Headset, label: "Assistant", detail: "répond ou transfère" },
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

/** Apercu de la fiche d'activation : les premiers champs que le client remplira. */
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

/** Apercu de l'installation par l'equipe, pour les solutions sans renvoi d'appel. */
export function SetupPreview() {
  return (
    <ul aria-hidden="true" className="space-y-2">
      {["Connexion à vos outils", "Tests sur vos cas réels", "Mise en service"].map((item, index) => (
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

const ACTIVITY_BY_FAMILY: Record<Family, string[]> = {
  call: ["Appel traité · horaires", "Appel transféré · urgence", "Appel traité · adresse"],
  "booking-call": ["Rendez-vous inscrit · jeudi", "Commande enregistrée", "Créneau proposé · lundi"],
  chat: ["Message répondu · devis", "Message répondu · horaires", "Conversation reprise par vous"],
  email: ["E-mail classé · prioritaire", "Brouillon prêt à relire", "E-mail classé · facture"],
  calendar: ["Réservation · mardi 9 h", "Réservation · jeudi 14 h", "Réservation · vendredi 11 h"],
  document: ["Contrat résumé · 18 pages", "Devis résumé · 4 pages", "Rapport résumé · 32 pages"],
  meeting: ["Compte-rendu · réunion d'équipe", "Compte-rendu · point client", "Actions à suivre · 3"],
  support: ["Demande prise en charge", "Réglage appliqué", "Question traitée par l'équipe"],
};

/** Apercu du fil d'activite une fois la solution en service. */
export function ActivityPreview({ slug }: { slug: string }) {
  const lines = ACTIVITY_BY_FAMILY[FAMILY_BY_SLUG[slug] ?? "support"];
  return (
    <div aria-hidden="true" className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <Label>Aujourd&apos;hui</Label>
        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[0.6875rem] text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          active
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
