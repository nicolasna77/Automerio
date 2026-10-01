import { PhoneForwarded } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CallForwardingGuide } from "./call-forwarding-guide";
import { FORWARDING_SECTION_ID } from "./billing-section";

// Onglet « Renvoi d'appel » des réglages : comment faire arriver ses appels
// sur l'assistant en gardant son numéro.
export function ServiceForwardingCard({ targetNumber }: { targetNumber: string }) {
  return (
    <Card id={FORWARDING_SECTION_ID} className="scroll-mt-24">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PhoneForwarded className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle as="h2" className="text-base">
              Renvoi d&apos;appel
            </CardTitle>
            <CardDescription>Recevez vos appels sur l&apos;assistant en gardant votre numéro.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CallForwardingGuide targetNumber={targetNumber} />
      </CardContent>
    </Card>
  );
}
