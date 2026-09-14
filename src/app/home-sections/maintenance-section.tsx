import { LifeBuoy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCents, type ServiceDTO } from "@/lib/catalog";

const PERKS = [
  {
    title: "Réponse prioritaire",
    description: "Vos demandes passent avant la file standard.",
  },
  {
    title: "Interlocuteur dédié",
    description: "Un contact Automerio qui connaît déjà vos automatisations.",
  },
  {
    title: "Suivi mensuel",
    description: "Un point régulier pour ajuster ce qui doit l'être.",
  },
];

export function MaintenanceSection({ services }: { services: ServiceDTO[] }) {
  const support = services.find((s) => s.slug === "support-prioritaire");
  if (!support) return null;

  return (
    <section id="abonnement" className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <LifeBuoy className="size-4" />
              </span>
              {support.monthlyPriceCents !== null && (
                <Badge>
                  {formatCents(support.monthlyPriceCents)}/mois TTC
                </Badge>
              )}
            </div>
            <CardTitle>{support.name}</CardTitle>
            <CardDescription>
              En plus du support déjà inclus dans chacune de vos solutions,
              le support prioritaire vous donne un accompagnement dédié.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
              {PERKS.map((item) => (
                <li key={item.title}>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
