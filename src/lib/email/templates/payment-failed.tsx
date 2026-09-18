import { Heading, Link, Text } from "@react-email/components";
import { appUrl } from "../app-url";
import {
  EmailLayout,
  emailHeadingStyle,
  emailButtonStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from "./layout";

export function PaymentFailedEmail({
  recipientName,
  serviceName,
}: {
  recipientName: string;
  serviceName: string;
}) {
  return (
    <EmailLayout preview={`Le paiement de « ${serviceName} » a échoué`}>
      <Heading
        as="h2"
        style={emailHeadingStyle}
      >
        Votre paiement n&apos;est pas passé
      </Heading>
      <Text style={emailTextStyle}>Bonjour {recipientName},</Text>
      <Text style={emailTextStyle}>
        Le prélèvement mensuel de « {serviceName} » a été refusé par votre
        banque. Votre solution reste active pour l&apos;instant : Stripe
        retentera le paiement dans les prochains jours.
      </Text>
      <Text style={emailTextStyle}>
        Pour éviter une interruption, vérifiez ou remplacez votre moyen de
        paiement.
      </Text>
      <Link href={appUrl("/dashboard/paiements")} style={emailButtonStyle}>
        Mettre à jour mon moyen de paiement
      </Link>
      <Text style={emailMutedTextStyle}>
        Sans paiement après les nouvelles tentatives, l&apos;abonnement sera
        résilié et la solution désactivée.
      </Text>
    </EmailLayout>
  );
}
