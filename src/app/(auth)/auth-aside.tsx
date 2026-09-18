import { CalendarCheck, PhoneCall, Send } from "lucide-react";

const CAPABILITIES = [
  { icon: PhoneCall, text: "Répond au téléphone et sur vos messageries" },
  { icon: CalendarCheck, text: "Prend les rendez-vous dans votre agenda" },
  { icon: Send, text: "Vous transmet l'essentiel, pas le reste" },
];

export function AuthAside() {
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
          Votre entreprise tourne.
        </span>
        <span className="mt-1.5 block text-[2.1rem] font-bold leading-[1] tracking-[-0.03em] font-stretch-88%">
          Vos automatisations s&apos;occupent du reste.
        </span>
      </p>

      <ul className="mt-9 max-w-sm space-y-3.5">
        {CAPABILITIES.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
            <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {text}
          </li>
        ))}
      </ul>

      <p className="mt-9 max-w-sm border-t border-border pt-5 text-sm leading-relaxed text-balance text-muted-foreground">
        Notre équipe l&apos;installe, la connecte à vos outils et la surveille
        chaque mois. Sans engagement, remboursé sous 30 jours si ça ne vous
        convient pas.
      </p>
    </aside>
  );
}
