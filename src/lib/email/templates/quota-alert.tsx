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
}: {
  recipientName: string;
  alert: "WARNING" | "EXCEEDED";
  serviceName: string;
  clientServiceId: string;
  consumed: string;
  included: string;
  overagePrice: string | null;
}) {
  const exceeded = alert === "EXCEEDED";
  const title = exceeded ? "Votre forfait est dépassé" : "Votre forfait est presque atteint";
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
            ? `Au-delà du forfait, chaque unité est facturée ${overagePrice} sur votre prochaine facture.`
            : `Au-delà du forfait, chaque unité sera facturée ${overagePrice} sur votre prochaine facture.`}
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
