import { Heading, Link, Text } from "@react-email/components";
import { appUrl } from "../app-url";
import {
  EmailLayout,
  emailButtonStyle,
  emailHeadingStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from "./layout";

export function QuotaAlertEmail({
  recipientName,
  alert,
  serviceName,
  clientServiceId,
  consumed,
  included,
  overagePrice,
  pausesAtLimit,
}: {
  recipientName: string;
  alert: "WARNING" | "EXCEEDED";
  serviceName: string;
  clientServiceId: string;
  consumed: string;
  included: string;
  overagePrice: string | null;
  pausesAtLimit: boolean;
}) {
  const exceeded = alert === "EXCEEDED";
  const title = exceeded
    ? pausesAtLimit
      ? "Votre forfait est atteint"
      : "Votre forfait est dépassé"
    : "Votre forfait est presque atteint";
  return (
    <EmailLayout preview={`${serviceName} : ${consumed} sur ${included}`}>
      <Heading as="h2" style={emailHeadingStyle}>
        {title}
      </Heading>
      <Text style={emailTextStyle}>Bonjour {recipientName},</Text>
      <Text style={emailTextStyle}>
        « {serviceName} » a consommé {consumed} sur les {included} compris ce mois-ci.
      </Text>
      {overagePrice && (
        <Text style={emailTextStyle}>
          {exceeded
            ? `Au-delà du forfait, la consommation est facturée ${overagePrice}, sur votre prochaine facture.`
            : `Au-delà du forfait, la consommation sera facturée ${overagePrice}, sur votre prochaine facture.`}
        </Text>
      )}
      {pausesAtLimit && (
        <Text style={emailTextStyle}>
          {exceeded
            ? "Vous avez refusé le dépassement : l'assistant est en pause jusqu'au renouvellement de votre forfait. Pour le relancer, acceptez le dépassement ou augmentez votre forfait dans les réglages de la solution."
            : "Vous avez refusé le dépassement : une fois le forfait atteint, l'assistant se mettra en pause jusqu'à son renouvellement. Vous pouvez accepter le dépassement dans les réglages de la solution."}
        </Text>
      )}
      <Text style={emailMutedTextStyle}>
        Si ce volume devient habituel, augmenter votre forfait revient moins cher que le
        dépassement.
      </Text>
      <Link href={appUrl(`/dashboard/services/${clientServiceId}`)} style={emailButtonStyle}>
        Ajuster mon forfait
      </Link>
    </EmailLayout>
  );
}
